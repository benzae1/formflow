import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { sortRoles, toRoleResponse } from "@/lib/roles";
import { createRoleSchema } from "@/lib/validation/roles";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const roles = sortRoles(
      await db.role.findMany({
        orderBy: { name: "asc" },
      }),
    );

    return Response.json({
      roles: roles.map(toRoleResponse),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    assertMutationRequest(req);
    const actor = await requireRole(["admin"]);
    const body = await req.json();
    const input = createRoleSchema.parse(body);

    const role = await db.role.create({
      data: {
        name: input.name,
        label: input.label,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "role.created",
      resourceType: "role",
      resourceId: role.id,
      afterState: role,
    });

    return Response.json({ role: toRoleResponse(role) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const message = firstIssue
        ? `${firstIssue.path.join(".") || "role"}: ${firstIssue.message}`
        : "The role details are invalid.";

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
