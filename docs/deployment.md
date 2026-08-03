# FormFlow deployment and operations

The repository can build and run a development stack. It does not yet contain a production-ready deployment. Treat `docker-compose.production.yml.example` as topology documentation only.

## Current images and services

The single-stage `Dockerfile` uses `node:24-bookworm-slim`, installs OpenSSL, installs all dependencies, copies the entire repository, and runs `npm run build`. The final image therefore includes source and development dependencies; it is not the minimal multi-stage image described by older documentation.

Base Compose runs six services:

| Service | Current behavior |
|---|---|
| `postgres` | PostgreSQL 16; two local databases (`formflow`, `temporal`) in one server |
| `temporal` | `temporalio/auto-setup:1.25`, backed by the local Temporal DB |
| `temporal-ui` | `temporalio/ui:2.37.2`, exposed on 8080 |
| `init` | Runs `npm run prisma:init`, then exits |
| `web` | Next.js server on 3000 with DB/Temporal health check |
| `worker` | Temporal worker with a process-based health check |

## Why the production example is not turnkey

Before first production use, resolve all P0 items in the handoff audit. In particular:

- `prisma:init` always runs the demo seed. With `NODE_ENV=production` it fails unless `ALLOW_DEMO_USERS=true`; that flag creates known-password demo accounts.
- The worker always creates an org-sync schedule. Without real LDAP configuration, the development adapter can create example identities and deactivate other synchronized/local users.
- Runtime dependencies currently have critical/high advisories.
- Legal/support content is placeholder text.
- Retention markers are not assigned automatically.
- No reverse proxy, TLS automation, secret store, resource limits, centralized telemetry, alert rules, backup jobs, or restore procedure is supplied.

## Target production topology

```text
Users -> institution-managed TLS proxy/WAF -> web replicas
                                           |-> application PostgreSQL
                                           `-> Temporal frontend

worker replicas -> application PostgreSQL + Temporal
Temporal frontend -> dedicated Temporal PostgreSQL

Internal-only: Temporal UI, database ports, metrics endpoints
External controlled services: LDAP, email provider, optional DeepL
```

Pin immutable image digests, restrict service networks, run as a non-root user, use a read-only root filesystem where practical, and add CPU/memory limits. Build a multi-stage production image and generate an SBOM.

## Required configuration

At minimum provide through a secret/configuration manager:

- HTTPS `NEXTAUTH_URL` and `APP_URL`;
- strong unique `NEXTAUTH_SECRET` and encryption keys;
- application and Temporal database credentials;
- Temporal address/namespace;
- reviewed LDAP URLs, base DNs, service account, role mappings, and sync filter;
- email enable/disable state, provider secret, and institutional sender;
- optional DeepL secret only after processor/data-flow approval;
- explicit authentication throttle values and log level.

Do not copy the university-specific UID/IP examples from old documentation. `.env.example` now demonstrates syntax without enabling LDAP, but it still contains known development secrets that must be replaced for any real environment.

## Database initialization

The desired production sequence is:

1. apply reviewed migrations with `prisma migrate deploy`;
2. bootstrap only immutable built-in roles or other approved reference data;
3. never create demo users/workflows;
4. start the web process;
5. start the worker only after LDAP/org-sync configuration is safe.

The current `npm run prisma:init` does not implement this separation. Do not set `PRISMA_AUTO_REPAIR_SCHEMA=true` in production because it invokes `prisma db push --accept-data-loss`.

## Reverse proxy requirements

- Terminate TLS and redirect HTTP to HTTPS.
- Replace, rather than trust/append, inbound `X-Forwarded-For`, `X-Real-IP`, `Host`, and `X-Forwarded-Proto` values according to the chosen proxy.
- Set request/body/time limits appropriate for Form.io payloads and long page responses.
- Do not expose PostgreSQL, Temporal gRPC, or Temporal UI publicly.
- Verify application CSP and security headers after the planned Next.js `middleware.ts` to `proxy.ts` migration.

The app adds CSP, frame denial, content-type, referrer, permissions, and production HSTS headers. Form/admin pages deliberately permit `unsafe-eval`; admin pages also allow the Form.io ACE CDN and blob workers. This exception needs security review and regression testing.

## Health, readiness, and observability

`GET /api/health` is public and returns 200 only when both PostgreSQL and Temporal respond; otherwise it returns 503 without raw error details. Use it for readiness, not as the only liveness signal. A broken Temporal dependency currently makes web readiness fail even for pages that could otherwise render.

Pino logs go to stdout (`LOG_LEVEL`, default `info`). Add structured collection, retention, redaction checks, dashboards, and alerts for:

- web/worker restarts and health failures;
- failed/stuck Temporal workflows and schedule failures;
- approval backlog, overdue tasks, and tasks assigned to deactivated users;
- LDAP sync counts/errors and unexpected mass deactivation;
- authentication failures/lockouts and rate-limit spikes;
- email delivery failures;
- retention backlog and audit-export activity.

## Backup and recovery

Back up both databases with encrypted, access-controlled, off-host copies. The application DB contains forms, form/workflow snapshots, encrypted submissions, approval tasks, identities, access control, notifications, and audit records. The Temporal DB is also required to resume in-flight workflows; it is not safely “recreatable” without losing process state.

Document and rehearse:

- RPO/RTO and backup schedule;
- point-in-time recovery;
- application and Temporal database consistency;
- restoration into an isolated environment;
- encryption-key escrow and recovery;
- post-restore reconciliation and user/session handling.

Do not store encryption keys only beside database backups.

## Retention and privacy operations

`npm run retention:report` reports records with due markers. `npm run retention:purge` deletes marked notifications, approval tasks, and submissions, but never audit logs. Neither command assigns dates. Establish policy-driven marker assignment, approval, dry run, referential-integrity tests, backup interaction, and a scheduler before relying on it.

## Release procedure after blockers are fixed

1. Review dependency advisories and lockfile diff; run the full suite.
2. Build an immutable image and scan it.
3. Back up and verify restore readiness.
4. Apply migrations as a dedicated job.
5. Deploy web and worker to staging; run `verify:stack`, accessibility scans, and representative LDAP/email tests.
6. Validate headers, proxy IP behavior, health/readiness, dashboards, alerts, and runbooks.
7. Obtain institutional launch approvals and schedule a rollback-capable production release.

## Rollback caution

Application image rollback is safe only when the prior version understands the migrated database schema and Temporal workflow histories. Prefer forward-compatible migrations and Temporal workflow versioning. Never automatically reverse a migration that may discard submitted or audit data.
