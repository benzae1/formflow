# FormFlow architecture

This document describes the repository at commit `68a93b0` and the documentation handoff that follows it. FormFlow is a Next.js 16 App Router application backed by PostgreSQL and a separate Temporal worker.

## Runtime view

```text
Browser
  |
  | HTTPS, NextAuth cookie, CSRF token on mutations
  v
Next.js web process (:3000)
  |-- server-rendered localized pages under /de and /en
  |-- JSON API under /api
  |-- PostgreSQL through Prisma
  |-- Temporal client (:7233)
  |-- LDAP for authentication and directory sync (optional)
  |-- DeepL for draft form translation (optional)
  `-- Resend for email delivery (optional)

Temporal worker
  |-- approvalWorkflow
  |-- orgSyncWorkflow and recurring schedule
  |-- PostgreSQL activities
  `-- Resend activities (optional)

PostgreSQL
  `-- application records; local Compose also gives Temporal its own DB in the same server
```

The base Compose stack contains `postgres`, `temporal`, `temporal-ui`, a one-shot `init`, `web`, and `worker`. Production should use separate application and Temporal database services.

## Source layout

| Path | Responsibility |
|---|---|
| `src/app/[lang]` | Canonical German/English pages |
| `src/app/admin`, `src/app/submissions`, etc. | Shared page implementations and legacy unlocalized route modules |
| `src/app/api` | Route handlers |
| `src/components` | Form.io adapters, submission views, navigation, UI primitives |
| `src/domain` | Workflow, role, submission, and organization types |
| `src/lib` | Authentication, authorization, validation, encryption, i18n, audit, data access |
| `src/temporal` | Worker, workflows, and activities |
| `src/jobs` | LDAP/development organization adapters and reconciliation |
| `prisma` | Schema, migrations, seed |
| `tests` | Vitest integration and Playwright end-to-end tests |

Middleware currently lives in `src/middleware.ts`. It redirects unlocalized page requests to German, injects the locale request header, and adds security headers. Next.js 16 still builds it but warns that the convention is deprecated in favor of `proxy.ts`.

## Authentication and authorization

NextAuth uses one credentials provider:

- With `LDAP_URLS` and `LDAP_BASE_DNS` configured, credentials are verified with LDAP and the database user is upserted.
- Otherwise, credentials are verified against local bcrypt hashes.
- JWT sessions last up to eight hours. The application refreshes the effective role list from PostgreSQL and checks `sessionVersion`; role changes and deactivation revoke existing sessions.
- Login throttling is stored in `LoginRateLimitBucket`; account lockout fields live on `User`.

Page access uses `requirePageUser`/`requirePageRole`. API access uses `requireUser`/`requireRole`. Submission visibility adds record-level rules for owners, assigned approvers, optional approver team scope, admins, and compliance users. Form visibility can additionally be restricted by allowed roles.

Mutating APIs require all of the following: a session, `x-formflow-intent: mutation`, the double-submit CSRF cookie/header, and matching `Origin` and `Referer` origins. `GET /api/csrf` itself is public and creates the CSRF cookie.

## Forms and submissions

`Form` holds the German source title/schema, optional localized content, sensitivity, allowed roles, workflow, and parent-form relation. `FormVersion` snapshots are created at creation and when title/schema/translations change while a form is published.

Only a hardened Form.io subset is accepted. Executable schema features, remote select sources, unsafe HTML patterns, unsupported custom properties, duplicate/unsafe keys, unsupported components, and schemas without a submit button are rejected.

Submissions store:

- the selected locale and a schema snapshot;
- a workflow ID/version/definition snapshot;
- encrypted response data where fields have `properties.sensitive: "true"`;
- lifecycle status and parent/child submission links;
- optional retention and purge markers.

The encryption envelope uses AES-256-GCM and hex-encoded `iv`, `tag`, and `value` fields plus `keyId`. Read filtering separately applies `properties.readRoles` and `properties.ownerCanRead`.

## Workflow execution

Submitting starts Temporal workflow type `approvalWorkflow` on task queue `formflow-approval`, using the submission ID as the Temporal workflow ID. The supported stages are:

- `approval`: resolve one or more users, create parallel tasks, wait for the first valid decision, cancel remaining tasks;
- `notification`: notify resolved recipients and continue;
- `condition`: evaluate all `expr-eval` expressions; continue on true and use `onReject` for the false branch;
- `trigger-form`: create a draft child submission and notify the original submitter.

Approval stages support reminders, an overdue timer, delegation on overdue, revision/resubmission, close, and `goTo` rejection routing. Workflow definitions and references are validated when workflows are saved and again when attached forms are saved/published.

Activity retries make external side effects an important design concern. Some activities create database rows and notifications without explicit idempotency keys; this is listed in the handoff audit for hardening.

## Organization sync

The worker creates a recurring `org-sync-scheduled` Temporal schedule. Manual sync is exposed to admins at `POST /api/org/sync` and runs synchronously.

The LDAP adapter derives department units from the `ou` values on user entries and infers managers from LDAP `manager` DNs. Reconciliation upserts users/units/memberships, removes stale memberships/units, and deactivates database users absent from a non-empty source result.

When LDAP is absent, the code currently selects `devOrgAdapter`, which is not a no-op: it supplies two example users and one department. Because reconciliation can deactivate other users, this path must be changed before operational use.

## Auditing and privacy controls

`AuditLog` records authentication events, API access, sensitive-access grants, selected form/workflow/user/role/delegation mutations, and approval signals. Sensitive submissions require a signed ten-minute grant; PII/sensitive admin list filters use an `admin-submissions` grant.

The log is an application table, not an append-only external audit store. Temporal activity-level task/status transitions are not all written as audit events. Do not describe the current log as complete or tamper-proof.

Retention columns exist on submissions, tasks, notifications, and audit logs, but the application does not calculate/populate them from form policy. The operator script only reports/purges records whose markers were set manually.

## Internationalization

Application chrome is typed in `src/lib/i18n/dictionaries.ts`. German is the default URL locale. Forms store German as their base and optional localized objects containing `title`, full `schema`, `reviewStatus`, and `generatedAt`. DeepL can create an English draft; a person must review it.

Some shared/legacy pages and Temporal-generated notification text still contain hard-coded English strings. Full language parity is therefore not complete.

## Known architectural debt

See [the handoff audit](../handoff/HANDOFF_AUDIT.md) for priorities. The main architectural themes are production bootstrap separation, safe org sync, dependency remediation, reliable retention/audit operations, idempotent activities, a tested encryption-key lifecycle, route/i18n consolidation, and production observability.
