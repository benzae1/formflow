import { writeAuditLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { getTemporalClient } from "@/lib/temporal";
import { decisionSchema } from "@/lib/validation/submissions";
import { approvalDecisionSignal } from "@/temporal/workflows/approvalWorkflow";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["admin", "approver"]);

    const { id } = await context.params;
    const body = await req.json();
    const input = decisionSchema.parse(body);

    const temporal = await getTemporalClient();
    const handle = temporal.workflow.getHandle(id);

    await handle.signal(approvalDecisionSignal, {
      taskId: input.taskId,
      decision: "approve",
      note: input.note,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "submission.approved",
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
