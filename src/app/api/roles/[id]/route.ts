import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import {
  assertRoleDeletionIsSafe,
  assertRoleRenameIsSafe,
  isBuiltInRoleName,
  toRoleResponse,
} from "@/lib/roles";
import { assertMutationRequest } from "@/lib/request-guard";
import { updateRoleSchema } from "@/lib/validation/roles";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await req.json();
    const input = updateRoleSchema.parse(body);

    const existing = await db.role.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError("ROLE_NOT_FOUND", "Role not found.", 404);
    }

    const nextName = input.name ?? existing.name;
    const nextLabel = input.label ?? existing.label;
    const renaming = nextName !== existing.name;

    if (renaming && isBuiltInRoleName(existing.name)) {
      throw new ApiError(
        "ROLE_PROTECTED",
        `Built-in role "${existing.name}" cannot be renamed.`,
        403,
      );
    }

    if (renaming) {
      await assertRoleRenameIsSafe(existing);
    }

    const role = await db.role.update({
      where: { id },
      data: {
        name: nextName,
        label: nextLabel,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "role.updated",
      resourceType: "role",
      resourceId: role.id,
      beforeState: existing,
      afterState: role,
    });

    return Response.json({ role: toRoleResponse(role) });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const message = firstIssue
        ? `${firstIssue.path.join(".") || "role"}: ${firstIssue.message}`
        : "The role update is invalid.";

      return apiErrorResponse(new ApiError("INVALID_ROLE_INPUT", message, 400));
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiErrorResponse(
        new ApiError("ROLE_NAME_TAKEN", "That role name is already in use.", 409),
      );
    }

    return apiErrorResponse(error);
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;

    const existing = await db.role.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError("ROLE_NOT_FOUND", "Role not found.", 404);
    }

    await assertRoleDeletionIsSafe(existing);

    await db.role.delete({
      where: { id },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "role.deleted",
      resourceType: "role",
      resourceId: existing.id,
      beforeState: existing,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
