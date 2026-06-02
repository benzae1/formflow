# FormFlow — Deployment Guide

## Overview

FormFlow is deployed as Docker containers. The recommended production setup separates the application database from the Temporal persistence database and puts all services behind a TLS-terminating reverse proxy.

The file `docker-compose.production.yml.example` in the repository root is the starting point for a production deployment. Copy and adapt it — do not use `docker-compose.yml` in production.

---

## Architecture

```
Internet
   │
   ▼
Reverse proxy (nginx / Traefik / Caddy)
   ├─ TLS termination
   ├─ HSTS enforcement
   └─ Forwards to Next.js (port 3000)

Next.js app (web container)
   ├─ PostgreSQL (app-db)
   └─ Temporal (temporal container)
        └─ PostgreSQL (temporal-db, separate)

Temporal worker (worker container)
   ├─ PostgreSQL (app-db)
   └─ Temporal (temporal container)
```

---

## Pre-Deployment Checklist

### Secrets

- [ ] `NEXTAUTH_SECRET` — generate with `openssl rand -hex 32` (64-character hex string)
- [ ] `FIELD_ENCRYPTION_KEY` — generate with `openssl rand -hex 32`
- [ ] Database passwords — strong random values, unique per database
- [ ] `RESEND_API_KEY` — obtain from Resend dashboard (or configure SMTP relay)
- [ ] `EMAIL_FROM_ADDRESS` — a real deliverable institutional address

Do not store secrets in `.env` files committed to version control. Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, Docker secrets, or Kubernetes secrets) and inject at runtime.

### Legal pages (mandatory before go-live)

- [ ] Imprint (Impressum) — real institutional details in `src/lib/legal-copy.ts`
- [ ] Privacy notice (Datenschutzhinweis) — DSGVO-compliant content, reviewed by DPO
- [ ] Accessibility statement (Barrierefreiheitserklärung) — based on real BITV assessment

See [DECISIONS_REQUIRED.md](../DECISIONS_REQUIRED.md) for full details.

### Infrastructure

- [ ] TLS certificate provisioned and configured on reverse proxy
- [ ] `NEXTAUTH_URL` and `APP_URL` set to the HTTPS production URL
- [ ] `NODE_ENV=production` set in the environment
- [ ] HSTS header is set automatically when `NODE_ENV=production` (via `src/middleware.ts`)

---

## Environment Variables (Production)

Copy `.env.example` and fill in production values. Key changes from development defaults:

```bash
# Production URL — must be HTTPS
NEXTAUTH_URL=https://formflow.uni-weimar.de
APP_URL=https://formflow.uni-weimar.de

# Secrets — generate fresh values, never reuse development secrets
NEXTAUTH_SECRET=<openssl rand -hex 32>
FIELD_ENCRYPTION_KEY=<openssl rand -hex 32>

# Database — separate host with strong credentials
DATABASE_URL=postgresql://formflow_app:<strong-password>@app-db:5432/formflow

# Temporal
TEMPORAL_ADDRESS=temporal:7233
TEMPORAL_NAMESPACE=default

# Email — required for notifications
RESEND_API_KEY=re_...
DISABLE_EMAIL_DELIVERY=false
EMAIL_FROM_ADDRESS=formflow@uni-weimar.de

# LDAP
LDAP_URLS="ldap://141.54.170.18:389,ldap://141.54.29.3:389"
LDAP_BASE_DNS="o=uni-we|o=uni"
LDAP_BIND_DN=""
LDAP_BIND_PASSWORD=""
LDAP_ADMIN_UIDS="sowa2176"
LDAP_FALLBACK_EMAIL_DOMAIN=uni-weimar.de

# Do NOT set ALLOW_DEMO_USERS in production
ALLOW_DEMO_USERS=
```

---

## Docker Compose (Production)

Use `docker-compose.production.yml.example` as your base. Key differences from the development compose file:

- Separate PostgreSQL instances for the app and Temporal
- All credentials via environment variables, not hardcoded
- Temporal UI optionally excluded or restricted to internal networks
- `restart: always` on all long-running services
- No port exposure for internal services (only the reverse proxy reaches the web container)

Example service structure:

```yaml
services:
  app-db:
    image: postgres:16
    environment:
      POSTGRES_USER: formflow_app
      POSTGRES_PASSWORD: ${APP_DB_PASSWORD}
      POSTGRES_DB: formflow

  temporal-db:
    image: postgres:16
    environment:
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: ${TEMPORAL_DB_PASSWORD}
      POSTGRES_DB: temporal

  temporal:
    image: temporalio/auto-setup:1.25
    environment:
      DB: postgres12
      POSTGRES_SEEDS: temporal-db
      POSTGRES_USER: temporal
      POSTGRES_PWD: ${TEMPORAL_DB_PASSWORD}

  web:
    image: your-registry/formflow:latest
    env_file: .env.production
    environment:
      DATABASE_URL: postgresql://formflow_app:${APP_DB_PASSWORD}@app-db:5432/formflow
      TEMPORAL_ADDRESS: temporal:7233
    ports:
      - "127.0.0.1:3000:3000"   # Only expose to localhost; reverse proxy handles TLS

  worker:
    image: your-registry/formflow:latest
    command: ["npm", "run", "worker"]
    env_file: .env.production
    environment:
      DATABASE_URL: postgresql://formflow_app:${APP_DB_PASSWORD}@app-db:5432/formflow
      TEMPORAL_ADDRESS: temporal:7233
```

---

## Building the Docker Image

```bash
docker build -t formflow:latest .
```

The Dockerfile uses a multi-stage build:
1. **deps** — installs `node_modules` with `npm ci`
2. **builder** — runs `npm run build` (Next.js production build)
3. **runner** — minimal Node 24 slim image with only the built output

The final image does not include source code, test files, or development dependencies.

---

## Database Migrations

Run migrations before starting the application:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://… \
  formflow:latest \
  npm run prisma:init
```

Or as a Docker Compose init container (see `docker-compose.production.yml.example`).

The `prisma:init` script:
1. Runs `prisma migrate deploy` (safe incremental migrations)
2. Runs `prisma db push` as a repair step only if `PRISMA_AUTO_REPAIR_SCHEMA=true` (development only)
3. Runs the seed script

In production, set `PRISMA_AUTO_REPAIR_SCHEMA=` (empty) and `ALLOW_DEMO_USERS=` (empty).

---

## Reverse Proxy Configuration

### nginx example

```nginx
server {
    listen 443 ssl http2;
    server_name formflow.uni-weimar.de;

    ssl_certificate     /etc/ssl/formflow.crt;
    ssl_certificate_key /etc/ssl/formflow.key;

    # Security headers (in addition to those set by the app)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name formflow.uni-weimar.de;
    return 301 https://$host$request_uri;
}
```

The `X-Forwarded-For` header is used by `getRequestIpAddress()` in `auth-security.ts` to bind rate-limit buckets to the real client IP.

---

## Health Check

The health endpoint at `/api/health` returns:

```json
{ "ok": true, "checks": { "database": { "ok": true }, "temporal": { "ok": true } } }
```

Use this with your container orchestrator's health check:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
  interval: 30s
  timeout: 5s
  retries: 3
```

---

## Monitoring

FormFlow logs using [Pino](https://getpino.io/). In production (`NODE_ENV=production`), logs are emitted as newline-delimited JSON to stdout. Forward these to your log aggregation system (ELK, Loki, CloudWatch, etc.).

Log level is controlled by `LOG_LEVEL` (default: `info`). Available levels: `trace`, `debug`, `info`, `warn`, `error`.

Key log events to monitor:
- `auth.login_failed` — repeated failures indicate a brute-force attempt
- HTTP 5xx responses — indicate unexpected server errors
- `Failed to send email notification` — indicates email delivery problems
- Temporal worker disconnection errors — indicate workflow processing is down

---

## Backup

Back up the PostgreSQL app database regularly. Critical data that is not recoverable from other sources:
- `Form` and `FormVersion` tables — form schemas and version history
- `Submission` and `ApprovalTask` tables — all submitted data and approval decisions
- `AuditLog` table — compliance evidence
- `User` and `Role` tables — access control configuration

The Temporal database can be recreated (in-flight workflows would be lost). Keep the app database as the source of truth.

---

## Upgrading

1. Pull the new image or rebuild: `docker build -t formflow:latest .`
2. Run migrations: `docker run --rm -e DATABASE_URL=… formflow:latest npx prisma migrate deploy`
3. Perform a rolling restart: `docker compose up -d --no-deps web worker`

Always run migrations before restarting the application containers.
