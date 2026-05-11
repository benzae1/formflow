import { writeAuditLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/errors";
import { assertMutationRequest } from "@/lib/request-guard";
import { syncOrg } from "@/jobs/orgSync";
import { devOrgAdapter } from "@/jobs/devOrgAdapter";
import { createLdapOrgAdapter } from "@/jobs/ldapOrgAdapter";
import { isLdapConfigured } from "@/lib/ldap";
import { requireRole } from "@/lib/permissions";

export async function POST(req: Request) {
  try {
    assertMutationRequest(req);
    const user = await requireRole(["admin"]);

    await writeAuditLog({
      actorId: user.id,
      action: "org.sync.started",
      resourceType: "org",
      resourceId: "manual-sync",
    });

    await syncOrg(isLdapConfigured() ? createLdapOrgAdapter() : devOrgAdapter);

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
