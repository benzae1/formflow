import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const actor = await requireRole(["admin", "approver"]);
    const { id } = await context.params;

    const delegation = await db.delegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new ApiError("DELEGATION_NOT_FOUND", "Delegation not found.", 404);
    }

    if (!actor.roles.includes("admin") && delegation.approverId !== actor.id) {
      throw new ApiError(
        "DELEGATION_FORBIDDEN",
        "You can only remove your own delegation window.",
        403,
      );
    }

    await db.delegation.delete({
      where: { id },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "delegation.deleted",
      resourceType: "delegation",
      resourceId: delegation.id,
      beforeState: delegation,
      metadata: {
        approverId: delegation.approverId,
        delegateId: delegation.delegateId,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
