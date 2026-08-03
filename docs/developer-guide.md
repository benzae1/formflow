# FormFlow developer guide

## Supported development baseline

Use Node.js 24, npm 10+, Docker 24+ and Docker Compose v2. CI and the Dockerfile use Node 24. Node 22 currently builds the project, but it is not the declared CI/runtime baseline.

## Setup

```bash
git clone <repository-url>
cd formflow
cp .env.example .env
npm install
docker compose up --build
```

The application is available at <http://localhost:3000>; Temporal UI is at <http://localhost:8080>. `init` must finish before `web` and `worker` start.

For live Next.js source mounting, add the development override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

For the Linux/Cisco Secure Client LDAP workaround, use `docker-compose.linux-vpn.yml` instead. It places `web`, `init`, and `worker` on the host network and is not appropriate for Windows/macOS.

## Environment variables

`.env.example` intentionally leaves LDAP, email, and DeepL disabled. Compose overrides host addresses with service names.

### Core and secrets

| Variable | Development default | Meaning |
|---|---|---|
| `DATABASE_URL` | local `formflow` PostgreSQL | Prisma database URL |
| `NEXTAUTH_URL` | `http://localhost:3000` | Canonical authentication/app URL |
| `APP_URL` | same local URL | Fallback for mutation-origin checks and email links |
| `NEXTAUTH_SECRET` | known zero value | JWT/sensitive-access signing secret; replace outside local development |
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal frontend |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |
| `LOG_LEVEL` | `info` in code | Pino log level |

### Field encryption

| Variable | Meaning |
|---|---|
| `FIELD_ENCRYPTION_KEY` | One 64-hex-character AES key stored as ID `default` |
| `FIELD_ENCRYPTION_KEYS` | Comma-separated `id=64-hex-key` entries; used for multi-key reads |
| `FIELD_ENCRYPTION_KEY_ID` | Active ID for new writes; otherwise the first multi-key entry or `default` |

Keep old keys configured while any database value references them. The existing `scripts/rotate-encryption-key.ts` is not safe for current nested data and must be fixed/tested before use.

### Authentication hardening

| Variable | Default |
|---|---|
| `AUTH_MAX_FAILED_ATTEMPTS` | `5` |
| `AUTH_FAILED_LOGIN_WINDOW_MINUTES` | `15` |
| `AUTH_LOCKOUT_DURATION_MINUTES` | `15` |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `60` |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | `10` |

The per-login and per-IP short-window counters are stored in PostgreSQL. Client IP extraction trusts the first `X-Forwarded-For` value, so the reverse proxy must replace/sanitize forwarding headers.

### LDAP and org sync

| Variable | Format/purpose |
|---|---|
| `LDAP_URLS` | Comma-separated LDAP URLs |
| `LDAP_BASE_DNS` | Pipe-separated base DNs; commas remain part of each DN |
| `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD` | Optional search service account |
| `LDAP_TIMEOUT_MS` | Client timeout; code fallback is 5000 ms, example uses 8000 ms |
| `LDAP_FALLBACK_EMAIL_DOMAIN` | Domain when an entry has no `mail` |
| `LDAP_ADMIN_UIDS`, `LDAP_APPROVER_UIDS`, `LDAP_COMPLIANCE_UIDS` | Comma-separated privileged UID allowlists |
| `LDAP_ROLE_ATTRIBUTE` | Optional multivalued role source attribute |
| `LDAP_ROLE_ATTRIBUTE_MAP` | Comma-separated `source-value=role` mappings |
| `LDAP_SYNC_FILTER` | Directory sync filter, default `(uid=*)` |
| `ORG_SYNC_INTERVAL_MINUTES` | Worker schedule interval, default `60` |

Legacy aliases `LDAP_URL` and `LDAP_BASE_DN` are accepted. Review the org-sync blocker before starting the worker or pressing manual sync without real LDAP configuration.

### Optional integrations

| Variable | Meaning |
|---|---|
| `RESEND_API_KEY` | Creates the Resend client when present |
| `DISABLE_EMAIL_DELIVERY` | Email sends only when this is not `true` |
| `EMAIL_FROM_ADDRESS` | Required when delivery is enabled |
| `DEEPL_API_KEY` | Enables German-to-English draft form translation through DeepL Free API |
| `ALLOW_DEMO_USERS` | Allows the demo seed when `NODE_ENV=production`; unsafe for real production |
| `PRISMA_AUTO_REPAIR_SCHEMA` | Enables `prisma db push --accept-data-loss` after migration drift; development only |

## Database and seed

Prisma 7 reads `DATABASE_URL` through `prisma.config.js`.

```bash
npm run prisma:generate
npm run prisma:migrate
npx prisma migrate deploy
npm run prisma:studio
```

`npm run prisma:init` performs `migrate deploy`, optionally repairs missing local tables, and always invokes `prisma db seed`. The seed creates four built-in roles, three known-password demo accounts, and a basic workflow. It throws in production unless `ALLOW_DEMO_USERS=true`; enabling that flag creates the demo accounts. Split role/bootstrap data from demo data before production.

The forms in `forms/` are examples only and are not imported by the seed.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

At the 2026-08-03 handoff, lint, typecheck, and build pass. The production dependency audit does not pass; see the handoff audit.

### Integration tests

The 65 Vitest integration cases require a reachable, migrated PostgreSQL database. Most route tests mock sessions and Temporal, while the health test checks Temporal behavior through mocks. Run:

```bash
npx prisma migrate deploy
npm run test:integration
```

Coverage includes authentication hardening, CSRF, forms, form access, Form.io hardening, translations, encryption config, submissions, break-glass reads, approval routes, workflows, roles, users/delegations, notifications, LDAP config, and health.

### Browser tests

Playwright requires the full stack:

```bash
npm run test:e2e:install
npm run test:e2e
```

Five runtime cases cover publish/submit/approve, revision/resubmission, rejection/route protection, and builder rendering in both locales. CI currently runs only the `@smoke` publish/submit/approve case.

```bash
npm run verify:stack   # wait for stack, integration + all browser tests
npm run verify:smoke   # lint, build, integration + @smoke browser test
```

## Common changes

### Prisma schema

Edit `prisma/schema.prisma`, create a migration with `npx prisma migrate dev --name <name>`, regenerate the client, and add an integration test. Never use `db push --accept-data-loss` against production.

### API route

Every handler should catch with `apiErrorResponse`. Use a page/API authorization helper and call `assertMutationRequest(req)` before any mutation. Validate body and query input with Zod; several older filters still cast query strings directly and are candidates for cleanup.

### Form.io support

Adding a component requires coordinated changes to the allowlist/validation in `formio-schema.ts`, data normalization in `formio-data.ts`, rendering/builder behavior, translation extraction where applicable, and tests. Do not simply enable Form.io executable properties.

### Workflow stage

Update `src/domain/workflow.ts`, Zod validation, server-side reference validation, the workflow designer, Temporal workflow behavior, and integration/browser tests. Temporal workflow changes must remain deterministic and should be versioned for already-running histories.

### Translations

Application strings live in `src/lib/i18n/dictionaries.ts`; both locales must satisfy the `Dictionary` type. Temporal notification strings and some legacy/shared UI strings are still hard-coded and should be moved to an explicit localization strategy.

## Repository hygiene

- Keep `.env`, Playwright artifacts, `.next`, and generated Prisma output out of commits.
- `test-results/.last-run.json` is currently tracked; consider untracking all generated test results.
- `@formio/react` is used by the renderer and `@formio/js` by the builder. The separate legacy `formiojs` dependency appears unused and should be verified/removed during dependency remediation.
- Keep current ownership, risk, and launch-readiness findings in the [`handoff/`](../handoff/README.md) package. Use Git history for superseded audit snapshots.
