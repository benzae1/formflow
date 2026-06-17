import { requirePendingApprovalTask } from "@/lib/approval-decisions";
import { writeAuditLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { getTemporalClient } from "@/lib/temporal";
import { decisionSchema } from "@/lib/validation/submissions";
import { approvalDecisionSignal } from "@/temporal/workflows/approvalWorkflow";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const user = await requireUser();

    const { id } = await context.params;
    const body = await req.json();
    const input = decisionSchema.parse(body);
    await requirePendingApprovalTask({
      submissionId: id,
      taskId: input.taskId,
      actorId: user.id,
    });

    const temporal = await getTemporalClient();
    const handle = temporal.workflow.getHandle(id);

    await handle.signal(approvalDecisionSignal, {
      taskId: input.taskId,
      decision: "approve",
      note: input.note,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "submission.approval_signalled",
      resourceType: "submission",
      resourceId: id,
      metadata: {
        taskId: input.taskId,
        note: input.note,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
