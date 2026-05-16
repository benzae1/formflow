import { db } from "@/lib/db";
import { getTemporalClient } from "@/lib/temporal";

export async function GET() {
  const checks = {
    database: { ok: false as boolean, error: null as string | null },
    temporal: { ok: false as boolean, error: null as string | null },
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database.ok = true;
  } catch (error) {
    checks.database.error = error instanceof Error ? error.message : "Database check failed.";
  }

  try {
    const temporal = await getTemporalClient();
    await temporal.workflow.count('ExecutionStatus = "Running"');
    checks.temporal.ok = true;
  } catch (error) {
    checks.temporal.error = error instanceof Error ? error.message : "Temporal check failed.";
  }

  const ok = checks.database.ok && checks.temporal.ok;

  return Response.json(
    {
      ok,
      checks,
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
