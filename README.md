# FormFlow

## Getting Started

1. Copy `.env.example` to `.env` and adjust values for your local services.
2. Start the full stack with Docker:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- Temporal on `localhost:7233`
- Temporal UI on `http://localhost:8080`
- Next.js app on `http://localhost:3000`
- Temporal worker in its own container
- Prisma migration and seed steps in the `init` container

When LDAP is not configured, the development seed creates these local credentials:

- Username `admin`, password `admin`, email `admin@bauhaus.de`
- Username `approver`, password `approver`, email `approver@bauhaus.de`
- Username `submitter`, password `submitter`, email `submitter@bauhaus.de`

For LDAP sign-in, configure the directory in `.env`:

```bash
LDAP_URLS="ldap://141.54.170.18:389,ldap://141.54.29.3:389"
LDAP_BASE_DNS="o=uni-we|o=uni"
LDAP_ADMIN_UIDS="sowa2176"
LDAP_APPROVER_UIDS=""
LDAP_COMPLIANCE_UIDS=""
LDAP_ROLE_ATTRIBUTE=""
LDAP_ROLE_ATTRIBUTE_MAP=""
```

The app searches for a unique `uid`, binds as that DN with the submitted password,
then upserts the LDAP user into FormFlow. Every LDAP user receives `submitter`;
additional roles come from the UID allowlists above or from
`LDAP_ROLE_ATTRIBUTE_MAP` entries like `formflow-admin=admin`.

If you need multiple search bases, `LDAP_BASE_DNS` uses `|` to separate them because commas are part of DN syntax.

Open `http://localhost:3000` in your browser.

## Docker Notes

- The `web` and `worker` containers read from `.env`, but their internal service URLs are overridden to use Docker service names like `postgres` and `temporal`.
- `docker-compose.yml` is optimized for local development and intentionally shares one Postgres instance across the app and Temporal for convenience.
- For production-style separation, start from [docker-compose.production.yml.example](/C:/Users/anton/Desktop/formflow/docker-compose.production.yml.example:1) and provision distinct databases, credentials, and durable secrets per service.
- The single Postgres service and shared credentials are a deliberate local-development shortcut for this stack. For production, split the app database from Temporal persistence and use distinct credentials.
- The `init` container runs `npm run prisma:init`, which deploys migrations and, for local Docker only, repairs a drifted schema with `prisma db push` if required tables are missing before seeding.
- If you change dependencies or Docker config, rerun `docker compose up --build`.
- To stop everything, run `docker compose down`.

## Prisma 7 Note

This project uses Prisma 7. Connection URLs for Prisma Migrate live in `prisma.config.ts`, not in `prisma/schema.prisma`.
## Verification

The repo now includes a hybrid verification stack:

- `vitest` integration tests for routes, DB behavior, notifications, and workflow progression
- `playwright` browser tests for the multi-role admin -> submitter -> approver journey

Recommended flow against the Dockerized stack:

```bash
docker compose up -d --build
npm run test:e2e:install
npm run verify:stack
```

Useful commands:

```bash
npm run test:integration
npm run test:e2e
npm run verify
npm run verify:smoke
```

`verify:stack` waits for the web app, PostgreSQL, and Temporal before running the suite.
