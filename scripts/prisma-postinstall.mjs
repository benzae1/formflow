import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDotEnv =
  existsSync(resolve(process.cwd(), ".env")) ||
  existsSync(resolve(process.cwd(), ".env.local"));

if (!hasDatabaseUrl && !hasDotEnv) {
  console.warn(
    "[postinstall] Skipping prisma generate because DATABASE_URL is not set and no local env file was found.",
  );
  process.exit(0);
}

const prismaBinary = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(prismaBinary, ["prisma", "generate"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
