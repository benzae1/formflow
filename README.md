# FormFlow

FormFlow is a German/English workflow application for university forms and human approval processes. It provides role-restricted Form.io forms, drafts and submissions, Temporal-backed approval workflows, LDAP or local authentication, field-level encryption, delegations, notifications, and an administrative audit view.

This repository is a mature prototype/internal beta, not a turnkey production service. Start with the [final handoff audit](HANDOFF_AUDIT.md) before planning a rollout. It records the confirmed launch blockers, verification status, and recommended work order. The German edition is [HANDOFF_AUDIT.de.md](HANDOFF_AUDIT.de.md).

## Documentation

| English | Deutsch | Scope |
|---|---|---|
| [Architecture](docs/architecture.md) | [Architektur](docs/de/architecture.md) | Runtime components, data model, security boundaries |
| [Developer guide](docs/developer-guide.md) | [Entwicklung](docs/de/developer-guide.md) | Setup, configuration, tests, common tasks |
| [Deployment](docs/deployment.md) | [Betrieb](docs/de/deployment.md) | Current containers and a production-readiness checklist |
| [API reference](docs/api-reference.md) | [API-Referenz](docs/de/api-reference.md) | Implemented HTTP endpoints and access rules |
| [Form authoring](docs/form-authoring.md) | [Formularerstellung](docs/de/form-authoring.md) | Supported Form.io subset, translations, field access |
| [Workflow authoring](docs/workflow-authoring.md) | [Workflow-Erstellung](docs/de/workflow-authoring.md) | Stages, routing, conditions, SLAs |
| [Roles and permissions](docs/roles-and-permissions.md) | [Rollen und Rechte](docs/de/roles-and-permissions.md) | Built-in/custom roles and permission matrix |
| [Example forms](forms/README.md) | [Beispielformulare](forms/README.de.md) | Status and safe reuse of repository form schemas |
| [Institutional decisions](DECISIONS_REQUIRED.md) | [Institutionelle Entscheidungen](DECISIONS_REQUIRED.de.md) | Decisions that engineering cannot make alone |
| [Privacy operations](audits/PRIVACY_OPERATIONS.md) | [Datenschutzbetrieb](audits/PRIVACY_OPERATIONS.de.md) | Current manual retention/DSAR runbook |

Earlier files under [`audits/`](audits/) are dated historical snapshots. They are useful for provenance, but the handoff audit supersedes their open-item lists.

## Current stack

- Next.js 16.2.4, React 19, TypeScript 5
- PostgreSQL 16 and Prisma 7
- Temporal Server 1.25 with Temporal TypeScript SDK 1.17
- NextAuth 4 credentials provider with LDAP or local bcrypt passwords
- Form.io 5 builder and Form.io React renderer
- Optional Resend email and DeepL draft translation
- Vitest integration tests and Playwright browser tests

## Quick start

Prerequisites: Docker with Compose v2. Host-side development and checks should use Node.js 24, matching the Dockerfile and CI.

```bash
cp .env.example .env
docker compose up --build
```

The development stack exposes:

| Service | Address | Purpose |
|---|---|---|
| Web | <http://localhost:3000> | Next.js application |
| Temporal UI | <http://localhost:8080> | Workflow inspection |
| PostgreSQL | `localhost:5432` | Shared app/Temporal database for local development only |

The one-shot `init` container applies migrations, repairs local schema drift when enabled, and seeds development data. The long-running `worker` container executes approval and org-sync workflows.

### Development accounts

With LDAP disabled, the seed provides these local logins:

| Login | Password | Roles |
|---|---|---|
| `admin` | `admin` | `admin`, `submitter` |
| `approver` | `approver` | `approver`, `submitter` |
| `submitter` | `submitter` | `submitter` |

These known credentials must never be enabled in production. The current production bootstrap path needs engineering work before rollout; see the handoff audit.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build

# Requires PostgreSQL plus the migrated test database
npm run test:integration

# Requires the complete running stack
npm run test:e2e
npm run verify:stack
```

`verify:smoke` runs lint, build, integration tests, and the Playwright test tagged `@smoke`. CI currently runs 65 integration cases and only that smoke browser journey; the remaining browser cases are local/full-suite coverage.

## Important operating boundaries

- `docker-compose.yml` is a development configuration. It shares one database service and contains development credentials.
- `docker-compose.production.yml.example` is an incomplete starting point, not a deployable production manifest.
- Do not run org sync without reviewing the LDAP and fallback behavior described in the handoff audit.
- Do not lose an encryption key. Encrypted field values cannot be recovered without the matching key.
- Legal, privacy, accessibility, and support text in the UI is placeholder content.

## Linux with Cisco Secure Client

When Cisco Secure Client blocks Docker bridge traffic to VPN-only LDAP hosts, use the Linux-only host-network override:

```bash
docker compose -f docker-compose.yml -f docker-compose.linux-vpn.yml up --build
```

Do not use this override on Windows or macOS, and review the wider host-network exposure before using it outside development.
