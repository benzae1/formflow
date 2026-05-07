import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
  sleep,
} from "@temporalio/workflow";
import type { RoutingTarget, WorkflowDefinition } from "@/domain/workflow";

type ApprovalSignal = {
  taskId: string;
  decision: "approve" | "reject" | "request-revision";
  note?: string;
};

export const approvalDecisionSignal =
  defineSignal<[ApprovalSignal]>("approvalDecision");

export const resubmittedSignal = defineSignal("resubmitted");

const activities = proxyActivities<{
  getWorkflowForSubmission(input: {
    workflowId: string;
  }): Promise<WorkflowDefinition>;
  resolveAssignees(
    target: RoutingTarget | RoutingTarget[],
    submitterId: string,
  ): Promise<string[]>;
  markSubmissionInReview(submissionId: string): Promise<void>;
  createApprovalTasks(input: {
    submissionId: string;
    stageIndex: number;
    assigneeIds: string[];
    dueAt?: string;
  }): Promise<string[]>;
  completeTask(input: {
    taskId: string;
    status: "approved" | "rejected" | "revision_requested";
    note?: string;
  }): Promise<void>;
  cancelRemainingTasks(taskIds: string[]): Promise<void>;
  setSubmissionStatus(input: {
    submissionId: string;
    status:
      | "submitted"
      | "in_review"
      | "needs_revision"
      | "approved"
      | "rejected"
      | "closed";
  }): Promise<void>;
  sendReminderIfTaskPending(taskId: string): Promise<void>;
  markTaskOverdueIfPending(taskId: string): Promise<void>;
}>({
  startToCloseTimeout: "30 seconds",
  retry: {
    maximumAttempts: 5,
  },
});

export async function approvalWorkflow(input: {
  submissionId: string;
  formId: string;
  workflowId: string;
  submitterId: string;
}) {
  let latestDecision: ApprovalSignal | undefined;
  let resubmitted = false;

  setHandler(approvalDecisionSignal, (decision) => {
    latestDecision = decision;
  });

  setHandler(resubmittedSignal, () => {
    resubmitted = true;
  });

  const stages = await activities.getWorkflowForSubmission({
    workflowId: input.workflowId,
  });

  await activities.markSubmissionInReview(input.submissionId);

  for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
    const stage = stages[stageIndex];

    // V1: notification stages are ignored until a dedicated execution model is added.
    if (stage.type === "notification") {
      continue;
    }

    // V1: condition stages are intentionally skipped until safe evaluation is wired in.
    if (stage.type === "condition") {
      continue;
    }

    // V1: trigger-form stages are deferred until chained submission creation is wired in.
    if (stage.type !== "approval") {
      continue;
    }

    const assigneeIds = await activities.resolveAssignees(
      stage.assignTo,
      input.submitterId,
    );

    if (assigneeIds.length === 0) {
      throw new Error(`No assignees resolved for stage ${stage.id}`);
    }

    const dueAt = stage.sla?.hours
      ? new Date(Date.now() + stage.sla.hours * 60 * 60 * 1000).toISOString()
      : undefined;

    const taskIds = await activities.createApprovalTasks({
      submissionId: input.submissionId,
      stageIndex,
      assigneeIds,
      dueAt,
    });

    const reminderHours = stage.sla?.reminderAt ?? [];

    for (const taskId of taskIds) {
      for (const reminderHour of reminderHours) {
        void (async () => {
          await sleep(`${reminderHour} hours`);
          await activities.sendReminderIfTaskPending(taskId);
        })();
      }

      if (stage.sla?.hours) {
        void (async () => {
          await sleep(`${stage.sla.hours} hours`);
          await activities.markTaskOverdueIfPending(taskId);
        })();
      }
    }

    latestDecision = undefined;

    await condition(() => {
      return (
        latestDecision !== undefined &&
        taskIds.includes(latestDecision.taskId)
      );
    });

    const decision = latestDecision;

    if (!decision) {
      throw new Error("Approval decision missing.");
    }

    if (decision.decision === "approve") {
      await activities.completeTask({
        taskId: decision.taskId,
        status: "approved",
        note: decision.note,
      });

      await activities.cancelRemainingTasks(
        taskIds.filter((id) => id !== decision.taskId),
      );

      if (stage.onApprove === "close" || stageIndex === stages.length - 1) {
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "approved",
        });

        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "closed",
        });

        return;
      }

      continue;
    }

    if (decision.decision === "reject") {
      await activities.completeTask({
        taskId: decision.taskId,
        status: "rejected",
        note: decision.note,
      });

      await activities.cancelRemainingTasks(
        taskIds.filter((id) => id !== decision.taskId),
      );

      await activities.setSubmissionStatus({
        submissionId: input.submissionId,
        status: "rejected",
      });

      await activities.setSubmissionStatus({
        submissionId: input.submissionId,
        status: "closed",
      });

      return;
    }

    if (decision.decision === "request-revision") {
      await activities.completeTask({
        taskId: decision.taskId,
        status: "revision_requested",
        note: decision.note,
      });

      await activities.cancelRemainingTasks(
        taskIds.filter((id) => id !== decision.taskId),
      );

      await activities.setSubmissionStatus({
        submissionId: input.submissionId,
        status: "needs_revision",
      });

      resubmitted = false;

      await condition(() => resubmitted);

      await activities.setSubmissionStatus({
        submissionId: input.submissionId,
        status: "in_review",
      });

      stageIndex -= 1;
    }
  }

  await activities.setSubmissionStatus({
    submissionId: input.submissionId,
    status: "approved",
  });

  await activities.setSubmissionStatus({
    submissionId: input.submissionId,
    status: "closed",
  });
}
