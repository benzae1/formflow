# FormFlow

## Getting Started

1. Copy `.env.example` to `.env` and adjust values for your local services.
2. Run the initial Prisma migration:

```bash
npx prisma migrate dev --name init
```

3. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Prisma 7 Note

This project uses Prisma 7. Connection URLs for Prisma Migrate live in `prisma.config.ts`, not in `prisma/schema.prisma`.
