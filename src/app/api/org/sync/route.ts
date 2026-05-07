import { apiErrorResponse } from "@/lib/errors";
import { syncOrg } from "@/jobs/orgSync";
import { devOrgAdapter } from "@/jobs/devOrgAdapter";
import { requireRole } from "@/lib/permissions";

export async function POST() {
  try {
    await requireRole(["admin"]);

    await syncOrg(devOrgAdapter);

    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
