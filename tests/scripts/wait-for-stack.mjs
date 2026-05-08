import { setTimeout as sleep } from "node:timers/promises";
import { Client as PgClient } from "pg";
import { Connection } from "@temporalio/client";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://formflow:formflow@localhost:5432/formflow";
const temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";

async function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForDatabase(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const client = new PgClient({ connectionString: databaseUrl });

    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return;
    } catch {
      try {
        await client.end();
      } catch {}
    }

    await sleep(2_000);
  }

  throw new Error("Timed out waiting for PostgreSQL.");
}

async function waitForTemporal(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const connection = await Connection.connect({
        address: temporalAddress,
      });
      await connection.close();
      return;
    } catch {}

    await sleep(2_000);
  }

  throw new Error("Timed out waiting for Temporal.");
}

await Promise.all([
  waitForHttp(`${baseUrl}/signin`),
  waitForDatabase(),
  waitForTemporal(),
]);

console.log("FormFlow stack is ready for verification.");
