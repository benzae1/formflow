# FormFlow — Developer Guide

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | Required for running tests outside Docker |
| Docker | 24+ | Required for the full development stack |
| Docker Compose | v2 | `docker compose` (not `docker-compose`) |
| npm | 10+ | Bundled with Node.js 20 |

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd formflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work for local development with Docker. You do not need to change anything to get the app running locally without LDAP.

### 3. Start the stack

```bash
docker compose up --build
```

Wait for all containers to report healthy. The first run takes 2–4 minutes because it builds the Docker image and runs Prisma migrations.

The app is available at [http://localhost:3000](http://localhost:3000).

### 4. Sign in

Default seed accounts (local only — only created when `ALLOW_DEMO_USERS` is set or when the database is empty during `npm run prisma:init`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | admin |
| `approver` | `approver` | approver |
| `submitter` | `submitter` | submitter |

---

## Environment Variables

All variables live in `.env`. The `web` and `worker` containers load `.env` via Docker Compose's `env_file` directive, with some values overridden per-service (e.g. `DATABASE_URL` uses Docker service names).

### Core

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://formflow:formflow@localhost:5432/formflow` | Prisma connection string |
| `NEXTAUTH_URL` | `http://localhost:3000` | Canonical application URL (used for CSRF origin checks and cookies) |
| `NEXTAUTH_SECRET` | *(zeroes in example)* | Secret for signing JWTs and sensitive-access cookies. **Must be a random 64-hex-character string in production.** |
| `APP_URL` | `http://localhost:3000` | Alternative to `NEXTAUTH_URL` for CSRF origin validation |
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal gRPC endpoint |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |

### Field Encryption

| Variable | Description |
|---|---|
| `FIELD_ENCRYPTION_KEY` | 64-character hex string (32 bytes). Used as key ID `key-1`. Required if any form has sensitive fields. |
| `FIELD_ENCRYPTION_KEYS` | Comma-separated `id:hexkey` pairs for multi-key rotation, e.g. `key-1:aabbcc…,key-2:ddeeff…`. Takes precedence over `FIELD_ENCRYPTION_KEY`. |

Key rotation: add a new key to `FIELD_ENCRYPTION_KEYS` and update `FIELD_ENCRYPTION_KEY` to the new key ID. Existing encrypted values are decrypted with whichever key was active at encryption time (stored in the `keyId` field).

### Authentication Hardening

| Variable | Default | Description |
|---|---|---|
| `AUTH_MAX_FAILED_ATTEMPTS` | `5` | Failed logins before account lockout |
| `AUTH_FAILED_LOGIN_WINDOW_MINUTES` | `15` | Window for counting failed attempts |
| `AUTH_LOCKOUT_DURATION_MINUTES` | `15` | How long an account stays locked |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate-limit window per login/IP |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | `10` | Max attempts within the rate-limit window |

### Email

| Variable | Default | Description |
|---|---|---|
| `RESEND_API_KEY` | *(empty)* | Resend API key. Email is disabled when empty. |
| `DISABLE_EMAIL_DELIVERY` | `true` | Set to `false` to enable email sending |
| `EMAIL_FROM_ADDRESS` | `FormFlow <notifications@example.com>` | **Must be set to a real address in production.** |

### LDAP

| Variable | Example | Description |
|---|---|---|
| `LDAP_URLS` | `ldap://141.54.29.3:389` | Comma-separated LDAP server URLs |
| `LDAP_BASE_DNS` | `o=uni` | Pipe-separated (`\|`) search base DNs |
| `LDAP_BIND_DN` | *(empty)* | Service account DN for search; leave blank for anonymous |
| `LDAP_BIND_PASSWORD` | *(empty)* | Service account password |
| `LDAP_TIMEOUT_MS` | `8000` | LDAP operation timeout |
| `LDAP_FALLBACK_EMAIL_DOMAIN` | `uni-weimar.de` | Domain appended to `uid` if the LDAP entry has no `mail` attribute |
| `LDAP_ADMIN_UIDS` | `sowa2176` | Comma-separated UIDs that receive the `admin` role |
| `LDAP_APPROVER_UIDS` | *(empty)* | Comma-separated UIDs that receive the `approver` role |
| `LDAP_COMPLIANCE_UIDS` | *(empty)* | Comma-separated UIDs that receive the `compliance` role |
| `LDAP_ROLE_ATTRIBUTE` | `eduPersonAffiliation` | LDAP attribute to map to roles |
| `LDAP_ROLE_ATTRIBUTE_MAP` | `Mitarbeiter=approver` | Comma-separated `ldap-value=role` pairs |
| `LDAP_SYNC_FILTER` | `(uid=*)` | LDAP filter for org sync |

### Seeding

| Variable | Default | Description |
|---|---|---|
| `ALLOW_DEMO_USERS` | *(empty)* | Set to `true` to allow the seed to run in production. In all non-production environments demo users are always seeded. |

### Temporal Worker

| Variable | Default | Description |
|---|---|---|
| `ORG_SYNC_INTERVAL_MINUTES` | `60` | How often the org sync schedule fires |

---

## Database Operations

This project uses **Prisma 7**. The connection URL lives in `prisma.config.js`, not in `schema.prisma`.

### Run migrations (development)

```bash
npx prisma migrate dev --name "describe_your_change"
```

### Apply migrations (production / CI)

```bash
npx prisma migrate deploy
```

### Reset the database (destructive — local only)

```bash
npx prisma migrate reset
```

This drops and recreates the database, runs all migrations, and reruns the seed.

### Open Prisma Studio

```bash
npx prisma studio
```

Opens a visual browser at [http://localhost:5555](http://localhost:5555).

### Seed script

The seed is in `prisma/seed.ts`. It creates:
- The four system roles (`admin`, `approver`, `submitter`, `compliance`)
- Three demo users (`admin`, `approver`, `submitter`) if the environment is not production
- One hardcoded "Basic approval" workflow assigned to the approver demo user

Forms in `forms/` are **not** imported by the seed. Load them manually via the admin UI.

Re-run seed without resetting:

```bash
npx ts-node prisma/seed.ts
```

---

## Running the Temporal Worker Locally

Start the full Docker stack as usual — it runs the worker in its own container. If you want to run the worker on your host machine instead (e.g. for debugging):

```bash
# Stop the Docker worker
docker compose stop worker

# Run locally
npm run worker
```

The worker connects to Temporal at `TEMPORAL_ADDRESS` (default `localhost:7233`).

---

## Testing

The project has two test suites:

### Integration Tests (Vitest)

Tests run against the running Docker stack (PostgreSQL + Temporal must be up).

```bash
npm run test:integration
```

Coverage areas:
- Auth routes (`auth.test.ts`)
- Form routes (`forms.route.test.ts`)
- Submission routes (`submissions.route.test.ts`, `submission-detail.route.test.ts`)
- Approval routes (`approval-routes.test.ts`)
- Workflow routes (`workflows.route.test.ts`)
- User management (`user-management.route.test.ts`)
- Notifications (`notification-activities.test.ts`)
- LDAP config parsing (`ldap-config.test.ts`)
- Request guard / CSRF (`request-guard.test.ts`)
- Form.io hardening (`formio-hardening.test.ts`)
- Health endpoint (`health.route.test.ts`)
- Form translations (`form-translations.test.ts`)

### E2E Tests (Playwright)

Browser-level tests against the full running stack.

```bash
# Install browsers (first time)
npm run test:e2e:install

# Run tests
npm run test:e2e
```

The E2E test (`tests/e2e/formflow.spec.ts`) walks through the full multi-role journey:
1. Admin creates a form and workflow
2. Submitter fills and submits the form
3. Approver reviews and approves
4. Submitter sees the approved status

### Full Verification Suite

```bash
docker compose up -d --build
npm run test:e2e:install
npm run verify:stack   # Waits for the stack, then runs integration + E2E
```

`verify:smoke` runs a quick health check + a minimal API check without the full browser suite.

---

## Common Development Tasks

### Add a new form field to the schema

1. Open the admin form builder at `/de/admin/forms/[id]/builder`
2. Drag and drop the new field
3. If the field contains personal data, mark it as `encrypted` in the field settings
4. Save — the form version increments automatically on next publish

### Create a new API route

1. Create the file at `src/app/api/[route]/route.ts`
2. Import and call `requireUser()` or `requireRole([…])` at the top of each handler
3. For mutating handlers, call `assertMutationRequest(req)` before any other logic
4. Return errors via `apiErrorResponse(error)` — it handles both `ApiError` and unexpected errors

Example skeleton:

```typescript
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { apiErrorResponse, ApiError } from "@/lib/errors";

export async function GET() {
  try {
    await requireRole(["admin"]);
    // … your logic
    return Response.json({ data: "…" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    assertMutationRequest(req);
    await requireRole(["admin"]);
    // … your logic
    return Response.json({ created: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
```

### Add a new workflow stage type

1. Add the type to `WorkflowStageType` in `src/domain/workflow.ts`
2. Add a Zod schema branch in `src/lib/validation/workflows.ts`
3. Handle the new stage in `src/temporal/workflows/approvalWorkflow.ts`
4. Add UI handling in the workflow builder component

### Change the i18n dictionaries

All translation strings are in `src/lib/i18n/dictionaries.ts`. Both `de` and `en` objects must have identical key structures — TypeScript enforces this via the `Dictionary` type.

### Regenerate Prisma client after schema changes

```bash
npx prisma generate
```

This happens automatically during `npm install` via the `postinstall` script.

---

## Project Structure

```
formflow/
├── docs/                   # This documentation
├── forms/                  # Form definition JSON files
├── audits/                 # LLM-generated code and security audits
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seed script
│   └── migrations/         # Migration history
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── [lang]/         # Locale-aware pages
│   │   ├── api/            # REST API routes
│   │   └── forms/[slug]/   # Public form submission pages
│   ├── components/         # React components
│   │   ├── form-builder/   # Form.io designer wrapper
│   │   ├── form-renderer/  # Form.io renderer wrapper
│   │   ├── submissions/    # Break-glass gate, submission views
│   │   └── ui/             # Bauhaus design system components
│   ├── domain/             # TypeScript domain types
│   ├── jobs/               # LDAP org sync adapters
│   ├── lib/                # Server-side utilities and business logic
│   │   ├── i18n/           # Locale config, dictionaries, routing
│   │   └── validation/     # Zod schemas for all input
│   └── temporal/           # Temporal workflow engine
│       ├── activities/     # Temporal activities
│       └── workflows/      # Temporal workflow definitions
└── tests/
    ├── e2e/                # Playwright browser tests
    ├── integration/        # Vitest API/DB integration tests
    └── support/            # Shared test fixtures and helpers
```
