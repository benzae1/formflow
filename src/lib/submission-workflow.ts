import type { WorkflowDefinition } from "@/domain/workflow";
import { db } from "@/lib/db";
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

  try {
    await temporal.workflow.start(approvalWorkflow, {
      taskQueue: "formflow-approval",
      workflowId: input.submissionId,
      args: [input],
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "WorkflowExecutionAlreadyStartedError" ||
        error.message.includes("Workflow execution already started"))
    ) {
      return;
    }

    throw error;
  }
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

type ActivateSubmissionWorkflowInput = StartSubmissionApprovalWorkflowInput & {
  statusBeforeSubmit: "draft" | "needs_revision";
};

export async function activateSubmissionWorkflow(
  input: ActivateSubmissionWorkflowInput,
) {
  await db.submission.update({
    where: { id: input.submissionId },
    data: {
      workflowRunId: input.submissionId,
    },
  });

  try {
    await startSubmissionApprovalWorkflow(input);
  } catch (error) {
    await db.submission.update({
      where: { id: input.submissionId },
      data: {
        workflowRunId: null,
      },
    });
    throw error;
  }

  try {
    return await db.submission.update({
      where: { id: input.submissionId },
      data: {
        status: "submitted",
      },
    });
  } catch (error) {
    await terminateSubmissionWorkflow(
      input.submissionId,
      "Submission activation failed before persistence completed.",
    );
    await db.submission.update({
      where: { id: input.submissionId },
      data: {
        status: input.statusBeforeSubmit,
        workflowRunId: null,
      },
    });
    throw error;
  }
}
