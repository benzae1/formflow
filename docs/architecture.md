# FormFlow — Architecture

## System Overview

FormFlow is a Next.js 15 application backed by PostgreSQL, with Temporal.io managing long-running approval workflows. Authentication is handled by NextAuth.js with either LDAP (university directory) or local password credentials.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│               Next.js Application (Port 3000)                │
│                                                              │
│  ┌────────────────────┐   ┌─────────────────────────────┐   │
│  │  Pages & UI        │   │  API Routes (/api/*)        │   │
│  │  src/app/[lang]/   │   │  src/app/api/               │   │
│  │  Bauhaus design    │   │  REST JSON, CSRF-protected  │   │
│  │  system, Form.io   │   │  role-gated endpoints       │   │
│  └────────────────────┘   └─────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  src/middleware.ts                                     │  │
│  │  • Locale detection & x-formflow-locale injection      │  │
│  │  • CSP, X-Frame-Options, HSTS, Referrer-Policy        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────┬────────────────────────────┬───────────────────────────┘
       │                            │
       ▼                            ▼
┌─────────────┐            ┌────────────────┐
│ PostgreSQL  │            │ Temporal.io    │
│ Port 5432   │            │ Port 7233      │
│             │            │                │
│ Prisma ORM  │            │ Workflow engine│
│ 12 models   │            │ + UI :8080     │
└─────────────┘            └───────┬────────┘
                                   │
                           ┌───────▼────────┐
                           │ Temporal Worker │
                           │ (separate       │
                           │  container)     │
                           └────────────────┘
```

External dependency (optional):

```
Next.js app ──► LDAP (Bauhaus-Universität directory)
Next.js app ──► Resend (transactional email)
```

---

## Application Layers

### Next.js App (`src/app/`)

The application uses the Next.js App Router with server components as the default. Locale-aware routing is done via the `[lang]` segment (`/de/` and `/en/`).

| Path segment | Purpose |
|---|---|
| `app/[lang]/` | All authenticated pages (dashboard, forms, submissions, admin) |
| `app/[lang]/admin/` | Admin-only pages: form builder, workflow builder, user management, org browser, audit log |
| `app/[lang]/submissions/[id]/` | Submission detail, with break-glass gate for sensitive forms |
| `app/[lang]/inbox/` | Approver inbox (pending approval tasks) |
| `app/api/` | REST JSON API, all protected by CSRF and session checks |
| `app/forms/[slug]/` | Public-facing form submission page (requires login, no admin required) |
| `app/signin/` | Login page (LDAP or local credentials) |
| `app/[lang]/imprint/` `privacy/` `accessibility/` `help/` | Legal and support pages |

### API Routes (`src/app/api/`)

Every mutating API route (`POST`, `PATCH`, `DELETE`) is protected by `assertMutationRequest()`, which validates:
- Session cookie (NextAuth JWT)
- CSRF token header matching CSRF cookie (HMAC-SHA256, timing-safe comparison)
- `Origin` header matching `APP_URL` / `NEXTAUTH_URL`
- `Referer` header present and origin matches

Read routes (`GET`) require a valid session via `requireUser()` or `requireRole()` but do not need CSRF tokens.

See [api-reference.md](api-reference.md) for the full route listing.

### Temporal Worker (`src/temporal/`)

A separate Node.js process polls Temporal for workflow tasks. It runs alongside the web app but as its own container.

**Registered workflows:**
- `approvalWorkflow` — drives the full submission lifecycle from `submitted` through approval stages to `approved`, `rejected`, or `closed`
- `orgSyncWorkflow` — periodically syncs LDAP org units and memberships into the database

**Activities registered:**
- `approvalActivities` — creates/updates `ApprovalTask` records, handles delegation resolution, sends SLA reminders
- `notificationActivities` — writes `Notification` records and optionally sends email via Resend
- `orgActivities` — upserts `OrgUnit` and `OrgMembership` records from LDAP data

The worker also schedules a recurring `orgSync` schedule via the Temporal Schedules API (default interval: 60 minutes, configurable via `ORG_SYNC_INTERVAL_MINUTES`).

---

## Data Model

```
User ──────────── Role (many-to-many)
 │
 ├── Form (createdBy)
 │    ├── FormVersion (snapshot per publish)
 │    ├── Workflow (attached workflow)
 │    └── Submission[]
 │         ├── ApprovalTask[]
 │         └── childSubmissions[]
 │
 ├── ApprovalTask (assignedTo)
 ├── Notification
 ├── OrgMembership → OrgUnit (tree)
 └── Delegation (approver ↔ delegate)

AuditLog (standalone, indexed by actor/resource/action/time)
```

### Key Models

**Form**
- `slug` — URL-safe identifier used in public form routes (`/forms/[slug]`)
- `schema` — Form.io JSON schema stored as `Json`
- `translations` — Optional JSON map of locale → translated schema
- `sensitivity` — `standard | pii | sensitive`; controls break-glass access
- `workflowId` — The workflow that runs when a submission is submitted
- `version` — Incremented on each publish; captured on every submission as a snapshot

**Submission**
- `data` — Form response data as `Json`; sensitive fields are AES-256-GCM encrypted
- `formSchemaSnapshot` — Copy of the form schema at time of submission (preserves history as forms evolve)
- `workflowDefinition` — Copy of the workflow definition at time of submission
- `status` — `draft → submitted → in_review → needs_revision → approved | rejected → closed`
- `parentSubmissionId` — Links child submissions triggered by `trigger-form` workflow stages

**AuditLog**
- Indexed on `(createdAt)`, `(actorId, createdAt)`, `(resourceType, resourceId, createdAt)`, `(action, createdAt)`
- Records every state change, access event, and administrative action
- Exported via `GET /api/audit-log?format=csv` for compliance review

**Delegation**
- Allows an approver to nominate a delegate for a time window (`startsAt`–`endsAt`)
- Resolution happens inside `approvalActivities.ts` at the point of task assignment

---

## Authentication Flow

```
POST /api/auth/callback/credentials
  │
  ├─ checkRateLimited()           ← in-memory bucket (resets on restart)
  ├─ isUserLoginLocked()          ← database-backed (survives restarts)
  ├─ LDAP bind or bcrypt verify
  ├─ recordFailedLoginAttempt()   ← writes to User table
  └─ NextAuth issues JWT
        ├─ accessTokenExpiry: 15 minutes
        └─ refreshTokenExpiry: 8 hours

Subsequent requests:
  JWT in HttpOnly cookie → getServerSession() / requireUser()
  Session validation also checks user.sessionVersion matches JWT
  (Role changes and deactivation increment sessionVersion, invalidating existing tokens)
```

### LDAP Authentication

On each LDAP login:
1. Search each base DN for `uid=<input>`
2. Bind as the found DN with the submitted password
3. Upsert the user record (name, email, externalId)
4. Assign roles from UID allowlists (`LDAP_ADMIN_UIDS` etc.) and/or attribute map
5. Strip roles not present in the allowlists (keeps the DB in sync with the config)

---

## Submission Lifecycle

```
[User] fills form → draft Submission created
         │
         ▼
[User] clicks Submit
         │
         ├─ data encrypted (AES-256-GCM for sensitive fields)
         ├─ schema + workflow snapshots captured
         ├─ status → submitted
         └─ Temporal approvalWorkflow started
                    │
          ┌─────────▼──────────┐
          │  Stage loop        │
          │  (WorkflowStage[]) │
          └─────────┬──────────┘
                    │
         ┌──────────┼──────────────────┐
         │          │                  │
    approval   notification      condition
         │          │                  │
    ApprovalTask  sendNotification  evaluate
    created       (email + in-app)  expression
         │
    ┌────┴─────────────────────────────────────────────┐
    │  Approver acts                                    │
    │                                                   │
    │  approve → next stage / close                     │
    │  reject  → close / return-to-submitter / goto    │
    │  revision_requested → submitter edits → signal   │
    └───────────────────────────────────────────────────┘
         │
         ▼
   status → approved | rejected | closed
```

---

## Security Architecture

### Defense-in-Depth Layers

1. **Edge / middleware** — `src/middleware.ts` injects CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS, and locale header
2. **Session** — NextAuth JWT with short access token (15 min), session version invalidation
3. **CSRF** — HMAC-SHA256 token in cookie + header, timing-safe comparison
4. **API guards** — `requireUser()` / `requireRole()` on every route; `assertMutationRequest()` on mutations
5. **Row-level visibility** — `submission-visibility.ts` generates per-user Prisma WHERE clauses
6. **Break-glass** — Sensitive submissions require a justified access grant (POST `/api/sensitive-access`, HMAC-signed cookie, 10-minute TTL, always audited)
7. **Field encryption** — AES-256-GCM on individual sensitive form fields; key rotation supported
8. **Audit log** — Every state change and access event recorded; CSV export for compliance

### Sensitive Field Encryption

Fields marked sensitive in the Form.io schema are identified by `src/lib/formio-sensitive-fields.ts`. On submission, `encryptSensitiveSubmissionData()` replaces plaintext field values with an object:

```json
{
  "__encrypted": true,
  "iv": "<base64>",
  "tag": "<base64>",
  "data": "<base64 ciphertext>",
  "keyId": "key-1"
}
```

Multi-key rotation is supported via `FIELD_ENCRYPTION_KEYS` (comma-separated `id:hexkey` pairs). The `FIELD_ENCRYPTION_KEY` variable is a shorthand for a single key named `key-1`.

---

## Internationalisation

The app supports German (`de`) and English (`en`). All UI text lives in `src/lib/i18n/dictionaries.ts` as static typed objects — no external translation service.

Locale is determined by:
1. URL segment: `/de/` or `/en/`
2. Default: `de` (applied by `src/middleware.ts` redirect logic and the root layout fallback)

The root layout reads `x-formflow-locale` from the request headers (set by the middleware) to apply the correct `lang` attribute to the `<html>` element.

---

## Org Sync

`orgSyncWorkflow` runs on a schedule (default: every 60 minutes) and:
1. Fetches all entries from LDAP matching `LDAP_SYNC_FILTER` (default: `(uid=*)`)
2. For each user found, ensures an `OrgUnit` exists for their department
3. Creates or updates `OrgMembership` records linking users to their org units

This powers the `org`-type routing target in workflows, which can route approval tasks to `submitter.manager`, `submitter.skip-level`, or `department.head`.

In development (when `LDAP_URLS` is not set), `devOrgAdapter.ts` is used as a no-op mock.
