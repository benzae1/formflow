import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { createDelegationSchema } from "@/lib/validation/users";

export async function POST(req: Request) {
  try {
    assertMutationRequest(req);
    const actor = await requireRole(["admin", "approver"]);
    const body = await req.json();
    const input = createDelegationSchema.parse(body);
    const approverId = actor.roles.includes("admin")
      ? (input.approverId ?? actor.id)
      : actor.id;

    if (!actor.roles.includes("admin") && input.approverId && input.approverId !== actor.id) {
      throw new ApiError(
        "DELEGATION_FORBIDDEN",
        "You can only manage your own delegation window.",
        403,
      );
    }

    if (approverId === input.delegateId) {
      throw new ApiError(
        "DELEGATION_SELF_NOT_ALLOWED",
        "Choose a different delegate.",
        409,
      );
    }

    const [approver, delegate] = await Promise.all([
      db.user.findUnique({ where: { id: approverId } }),
      db.user.findUnique({ where: { id: input.delegateId } }),
    ]);

    if (!approver) {
      throw new ApiError("APPROVER_NOT_FOUND", "Approver not found.", 404);
    }

    if (!delegate) {
      throw new ApiError("DELEGATE_NOT_FOUND", "Delegate not found.", 404);
    }

    if (approver.deactivatedAt || delegate.deactivatedAt) {
      throw new ApiError(
        "DELEGATION_INACTIVE_USER",
        "Delegations can only be created for active users.",
        409,
      );
    }

    if (
      !approver.roles.includes("approver") &&
      !approver.roles.includes("admin")
    ) {
      throw new ApiError(
        "DELEGATION_APPROVER_ROLE_REQUIRED",
        "Delegation can only be created for approvers.",
        409,
      );
    }

    if (
      !delegate.roles.includes("approver") &&
      !delegate.roles.includes("admin")
    ) {
      throw new ApiError(
        "DELEGATION_DELEGATE_ROLE_REQUIRED",
        "Delegate must be an approver or admin.",
        409,
      );
    }

    const overlapping = await db.delegation.findFirst({
      where: {
        approverId,
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
      },
    });

    if (overlapping) {
      throw new ApiError(
        "DELEGATION_OVERLAP",
        "This approver already has a delegation window that overlaps.",
        409,
      );
    }

    const delegation = await db.delegation.create({
      data: {
        approverId,
        delegateId: input.delegateId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "delegation.created",
      resourceType: "delegation",
      resourceId: delegation.id,
      afterState: delegation,
      metadata: {
        approverId,
        delegateId: input.delegateId,
      },
    });

    return Response.json({ delegation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
