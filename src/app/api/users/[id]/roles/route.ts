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
      include: { roles: true },
    });

    if (!existing) {
      throw new ApiError("USER_NOT_FOUND", "User not found.", 404);
    }

    const roles = Array.from(new Set(input.roles));
    const resolvedRoles = await db.role.findMany({
      where: {
        name: {
          in: roles,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (resolvedRoles.length !== roles.length) {
      const foundRoleNames = new Set(resolvedRoles.map((role) => role.name));
      const missingRoles = roles.filter((role) => !foundRoleNames.has(role));

      throw new ApiError(
        "ROLE_NOT_FOUND",
        `Unknown role: ${missingRoles.join(", ")}.`,
        400,
      );
    }

    const isSelf = actor.id === id;

    const user = await db.user.update({
      where: { id },
      include: { roles: true },
      data: {
        roles: {
          set: resolvedRoles.map((role) => ({ id: role.id })),
        },
        ...(!isSelf
          ? {
              sessionVersion: {
                increment: 1,
              },
            }
          : {}),
        ...(input.teamScope !== undefined ? { teamScope: input.teamScope } : {}),
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "user.role_changed",
      resourceType: "user",
      resourceId: user.id,
      beforeState: { roles: existing.roles.map((role) => role.name), teamScope: existing.teamScope },
      afterState: { roles: user.roles.map((role) => role.name), teamScope: user.teamScope },
      metadata: { email: user.email, sessionsRevoked: !isSelf },
    });

    return Response.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
