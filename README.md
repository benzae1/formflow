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

The development seed creates these email-only sign-ins:

- `admin@example.com`
- `approver@example.com`
- `submitter@example.com`

Open `http://localhost:3000` in your browser.

## Docker Notes

- The `web` and `worker` containers read from `.env`, but their internal service URLs are overridden to use Docker service names like `postgres` and `temporal`.
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
