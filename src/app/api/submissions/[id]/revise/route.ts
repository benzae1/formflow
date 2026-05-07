import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { getTemporalClient } from "@/lib/temporal";
import { decisionSchema } from "@/lib/validation/submissions";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "approver"]);

    const { id } = await context.params;
    const body = await req.json();
    const input = decisionSchema.parse(body);

    const temporal = await getTemporalClient();
    const handle = temporal.workflow.getHandle(id);

    await handle.signal("approvalDecision", {
      taskId: input.taskId,
      decision: "request-revision",
      note: input.note,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
