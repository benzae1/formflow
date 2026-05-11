import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { updateUserRolesSchema } from "@/lib/validation/users";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await req.json();
    const input = updateUserRolesSchema.parse(body);

    const existing = await db.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError("USER_NOT_FOUND", "User not found.", 404);
    }

    const roles = Array.from(new Set(input.roles));

    const user = await db.user.update({
      where: { id },
      data: { roles },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "user.role_changed",
      resourceType: "user",
      resourceId: user.id,
      beforeState: { roles: existing.roles },
      afterState: { roles: user.roles },
      metadata: { email: user.email },
    });

    return Response.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
