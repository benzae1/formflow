import { writeAuditLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/errors";
import { syncOrg } from "@/jobs/orgSync";
import { devOrgAdapter } from "@/jobs/devOrgAdapter";
import { requireRole } from "@/lib/permissions";

export async function POST() {
  try {
    const user = await requireRole(["admin"]);

    await writeAuditLog({
      actorId: user.id,
      action: "org.sync.started",
      resourceType: "org",
      resourceId: "manual-sync",
    });

    await syncOrg(devOrgAdapter);

    await writeAuditLog({
      actorId: user.id,
      action: "org.sync.completed",
      resourceType: "org",
      resourceId: "manual-sync",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
