import { apiErrorResponse, ApiError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { buildSensitiveAccessCookie } from "@/lib/sensitive-access";
import { writeAuditLog } from "@/lib/audit";
import { assertMutationRequest } from "@/lib/request-guard";

export async function POST(request: Request) {
  try {
    assertMutationRequest(request);
    const user = await requireUser();
    const body = (await request.json()) as {
      scope?: string;
      reason?: string;
    };

    const scope = body.scope?.trim();
    const reason = body.reason?.trim();

    if (!scope) {
      throw new ApiError("SENSITIVE_SCOPE_REQUIRED", "A sensitive access scope is required.", 400);
    }

    if (scope !== "admin-submissions" && !/^submission:[a-z0-9-]+$/i.test(scope)) {
      throw new ApiError("SENSITIVE_SCOPE_INVALID", "The sensitive access scope is invalid.", 400);
    }

    if (!reason || reason.length < 10) {
      throw new ApiError(
        "SENSITIVE_REASON_REQUIRED",
        "A reason of at least 10 characters is required.",
        400,
      );
    }

    await writeAuditLog({
      actorId: user.id,
      action: "sensitive.access.granted",
      resourceType: "sensitive_access",
      resourceId: scope,
      metadata: {
        reason,
      },
    });

    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": buildSensitiveAccessCookie({
            actorId: user.id,
            scope,
            reason,
          }),
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
