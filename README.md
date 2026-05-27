# FormFlow

FormFlow is a secure, bilingual (German/English) workflow platform for managing administrative forms and approval processes at Bauhaus-Universität Weimar. It handles form authoring, submission routing, multi-stage approvals, compliance-grade audit logging, and LDAP-backed authentication.

## Documentation

| Document | Description |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System architecture, data flow, and component overview |
| [docs/api-reference.md](docs/api-reference.md) | Full REST API reference |
| [docs/developer-guide.md](docs/developer-guide.md) | Local setup, environment variables, and testing |
| [docs/workflow-authoring.md](docs/workflow-authoring.md) | How to build approval workflows |
| [docs/form-authoring.md](docs/form-authoring.md) | How to create forms and mark sensitive fields |
| [docs/roles-and-permissions.md](docs/roles-and-permissions.md) | Role definitions and permission matrix |
| [docs/deployment.md](docs/deployment.md) | Production deployment guide |
| [forms/README.md](forms/README.md) | Form library and example forms |
| [audits/](audits/) | LLM-assisted production readiness audits |
| [DECISIONS_REQUIRED.md](DECISIONS_REQUIRED.md) | Governance and legal items requiring sign-off |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for running tests outside Docker)

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` as needed. The defaults work for local development without LDAP.

### 2. Start the stack

```bash
docker compose up --build
```

This starts six containers in order:

| Container | Role | Port |
|---|---|---|
| `postgres` | PostgreSQL 16 database | 5432 |
| `temporal` | Temporal workflow server | 7233 |
| `temporal-ui` | Temporal web console | 8080 |
| `init` | Runs migrations and seeds, then exits | — |
| `web` | Next.js application | 3000 |
| `worker` | Temporal workflow worker | — |

Open [http://localhost:3000](http://localhost:3000) when the `web` container is healthy.

### 3. Sign in

When LDAP is not configured, the seed creates three local accounts:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | admin |
| `approver` | `approver` | approver |
| `submitter` | `submitter` | submitter |

## Architecture Overview

```
Browser
  │
  ▼
Next.js app (src/app/)
  ├─ Pages & UI  ([lang]/ routes, Bauhaus design system)
  ├─ API routes  (/api/*)
  └─ Proxy middleware  (src/proxy.ts → rename to middleware.ts)
        │
        ├─ PostgreSQL  (Prisma ORM)
        │    └─ Users, Forms, Workflows, Submissions,
        │       ApprovalTasks, Notifications, AuditLog
        │
        ├─ Temporal  (workflow engine)
        │    └─ Approval workflow, LDAP org-sync workflow
        │
        └─ LDAP  (authentication + org sync)
             └─ Bauhaus-Universität directory
```

See [docs/architecture.md](docs/architecture.md) for a full breakdown.

## LDAP Configuration

Add the following to `.env` to enable LDAP sign-in and org sync:

```bash
LDAP_URLS="ldap://141.54.29.3:389"
LDAP_BASE_DNS="o=uni"
LDAP_ADMIN_UIDS="sowa2176"          # Comma-separated UIDs that get the admin role
LDAP_APPROVER_UIDS=""               # Comma-separated UIDs that get the approver role
LDAP_COMPLIANCE_UIDS=""             # Comma-separated UIDs that get the compliance role
LDAP_ROLE_ATTRIBUTE="eduPersonAffiliation"  # Optional: LDAP attr for role mapping
LDAP_ROLE_ATTRIBUTE_MAP=""          # e.g. "Mitarbeiter=approver,Student=submitter"
```

`LDAP_BASE_DNS` uses `|` as separator because commas are part of DN syntax. Every LDAP user gets the `submitter` role by default; elevated roles come from the UID allowlists or attribute map above.

## Running Tests

```bash
# Start the full stack first
docker compose up -d --build

# Install Playwright browsers (first time only)
npm run test:e2e:install

# Run the full verification suite (waits for the stack to be ready)
npm run verify:stack

# Individual suites
npm run test:integration   # Vitest integration tests
npm run test:e2e           # Playwright browser tests
npm run verify:smoke       # Smoke check against the running app
```

## Key Features

- **Bilingual UI** — German and English, locale-aware routing under `/de/` and `/en/`
- **LDAP authentication** — bind-and-search against the university directory, with local password fallback
- **Role-based access control** — four roles: `admin`, `compliance`, `approver`, `submitter`
- **Form.io form builder** — drag-and-drop form designer with sensitive-field marking
- **Multi-stage approval workflows** — sequential, conditional, and parallel routing via Temporal
- **Break-glass access** — sensitive submissions require a logged justification before access
- **Field-level encryption** — AES-256-GCM encryption for PII and sensitive form fields
- **Approval delegation** — approvers can delegate to a colleague for a defined time window
- **Full audit trail** — every access and state change is logged; CSV export available
- **In-app and email notifications** — task assignments, deadlines, and outcomes

## Docker Notes

- `docker-compose.yml` shares one PostgreSQL instance between the app and Temporal. This is intentional for development convenience.
- For production, use `docker-compose.production.yml.example` as a starting point. It separates databases and uses environment-driven credentials.
- If you change dependencies or Dockerfile, re-run `docker compose up --build`.
- To stop: `docker compose down`. To also remove the database volume: `docker compose down -v`.

## Prisma 7

This project uses Prisma 7. Database connection URLs live in `prisma.config.js`, not in `prisma/schema.prisma`. Migration commands use `npx prisma migrate dev` as normal; the `prisma:init` script handles migration and seed automatically on container start.
