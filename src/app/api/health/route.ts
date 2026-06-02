import { db } from "@/lib/db";
import { getTemporalClient } from "@/lib/temporal";

export async function GET() {
  const checks = {
    database: { ok: false as boolean },
    temporal: { ok: false as boolean },
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database.ok = true;
  } catch {
    checks.database.ok = false;
  }

  try {
    const temporal = await getTemporalClient();
    await temporal.workflow.count('ExecutionStatus = "Running"');
    checks.temporal.ok = true;
  } catch {
    checks.temporal.ok = false;
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
