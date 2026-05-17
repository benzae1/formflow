import type { WorkflowDefinition } from "@/domain/workflow";
import { getTemporalClient } from "@/lib/temporal";
import { approvalWorkflow } from "@/temporal/workflows/approvalWorkflow";

type StartSubmissionApprovalWorkflowInput = {
  submissionId: string;
  formId: string;
  workflowId: string;
  workflowVersion: number;
  workflowDefinition: WorkflowDefinition;
  submitterId: string;
};

export async function startSubmissionApprovalWorkflow(
  input: StartSubmissionApprovalWorkflowInput,
) {
  const temporal = await getTemporalClient();

  await temporal.workflow.start(approvalWorkflow, {
    taskQueue: "formflow-approval",
    workflowId: input.submissionId,
    args: [input],
  });
}

export async function terminateSubmissionWorkflow(
  submissionId: string,
  reason: string,
) {
  const temporal = await getTemporalClient();

  try {
    await temporal.workflow.getHandle(submissionId).terminate(reason);
  } catch {
    // Best effort rollback for partially-activated workflows.
  }
}
