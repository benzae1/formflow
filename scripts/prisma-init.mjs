import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

try {
  process.loadEnvFile?.();
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

const REQUIRED_TABLES = [
  "ApprovalTask",
  "AuditLog",
  "Delegation",
  "Form",
  "FormVersion",
  "Notification",
  "OrgMembership",
  "OrgUnit",
  "Role",
  "Submission",
  "User",
  "Workflow",
  "_UserRoles",
];

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function getMissingTables(connectionString) {
  const client = new Client({ connectionString });

  await client.connect();

  try {
    const result = await client.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `,
    );
    const existingTables = new Set(result.rows.map((row) => row.table_name));
    return REQUIRED_TABLES.filter((table) => !existingTables.has(table));
  } finally {
    await client.end();
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  run("npx", ["prisma", "migrate", "deploy"]);

  const missingTables = await getMissingTables(connectionString);

  if (missingTables.length > 0) {
    const allowRepair = process.env.PRISMA_AUTO_REPAIR_SCHEMA === "true";
    const message =
      `Detected drift after prisma migrate deploy. Missing public tables: ${missingTables.join(", ")}.`;

    if (!allowRepair) {
      throw new Error(
        `${message} Recreate the local database or rerun with PRISMA_AUTO_REPAIR_SCHEMA=true to repair it via prisma db push before seeding.`,
      );
    }

    console.warn(
      `${message} Repairing schema with prisma db push before seeding. This may drop stale columns left over from older local schemas.`,
    );
    run("npx", ["prisma", "db", "push", "--accept-data-loss"]);

    const missingAfterRepair = await getMissingTables(connectionString);
    if (missingAfterRepair.length > 0) {
      throw new Error(
        `Schema repair did not restore all required tables. Still missing: ${missingAfterRepair.join(", ")}.`,
      );
    }
  }

  run("npx", ["prisma", "db", "seed"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
