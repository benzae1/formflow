import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
  sleep,
} from "@temporalio/workflow";
import type { RoutingTarget, WorkflowDefinition } from "@/domain/workflow";
import { evaluateCondition } from "@/lib/workflow-conditions";

type ApprovalSignal = {
  taskId: string;
  decision: "approve" | "reject" | "request-revision";
  note?: string;
};

export const approvalDecisionSignal =
  defineSignal<[ApprovalSignal]>("approvalDecision");

export const resubmittedSignal = defineSignal("resubmitted");

const activities = proxyActivities<{
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
  sendStageNotification(input: {
    submissionId: string;
    userIds: string[];
    stageName: string;
  }): Promise<void>;
  notifySubmitterOfRevision(input: {
    submissionId: string;
    submitterId: string;
    note?: string;
  }): Promise<void>;
  notifySubmitterOfOutcome(input: {
    submissionId: string;
    submitterId: string;
    outcome: "approved" | "rejected";
    note?: string;
  }): Promise<void>;
  getSubmissionWorkflowContext(submissionId: string): Promise<Record<string, unknown>>;
  createChildSubmission(input: {
    parentSubmissionId: string;
    childFormId: string;
    submitterId: string;
  }): Promise<string>;
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
  workflowVersion: number;
  workflowDefinition: WorkflowDefinition;
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

  const stages = input.workflowDefinition;

  await activities.markSubmissionInReview(input.submissionId);

  for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
    const stage = stages[stageIndex];

    if (stage.type === "notification") {
      if (!stage.assignTo) {
        throw new Error(`No routing target configured for stage ${stage.id}`);
      }

      const userIds = await activities.resolveAssignees(
        stage.assignTo,
        input.submitterId,
      );

      if (userIds.length > 0) {
        await activities.sendStageNotification({
          submissionId: input.submissionId,
          userIds,
          stageName: stage.name,
        });
      }

      continue;
    }

    if (stage.type === "condition") {
      const workflowContext = await activities.getSubmissionWorkflowContext(
        input.submissionId,
      );
      const matches = (stage.conditions ?? []).every((item) =>
        evaluateCondition(item.expression, workflowContext),
      );

      if (matches) {
        continue;
      }

      const falseBranch = stage.onReject;

      if (falseBranch === "return-to-submitter") {
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "needs_revision",
        });
        await activities.notifySubmitterOfRevision({
          submissionId: input.submissionId,
          submitterId: input.submitterId,
        });
        resubmitted = false;
        await condition(() => resubmitted);
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "in_review",
        });
        stageIndex -= 1;
        continue;
      }

      if (typeof falseBranch === "object" && falseBranch?.goTo) {
        stageIndex = jumpToStage(stages, falseBranch.goTo);
        continue;
      }

      if (falseBranch === "close") {
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "rejected",
        });
        await activities.notifySubmitterOfOutcome({
          submissionId: input.submissionId,
          submitterId: input.submitterId,
          outcome: "rejected",
        });
        return;
      }

      continue;
    }

    if (stage.type === "trigger-form") {
      if (!stage.childFormId) {
        throw new Error(`No child form configured for stage ${stage.id}`);
      }

      await activities.createChildSubmission({
        parentSubmissionId: input.submissionId,
        childFormId: stage.childFormId,
        submitterId: input.submitterId,
      });
      continue;
    }

    if (stage.type !== "approval") {
      continue;
    }

    if (!stage.assignTo) {
      throw new Error(`No routing target configured for stage ${stage.id}`);
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

      const overdueHours = stage.sla?.hours;
      if (overdueHours) {
        void (async () => {
          await sleep(`${overdueHours} hours`);
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

    const resolvedDecision: ApprovalSignal = decision;

    if (resolvedDecision.decision === "approve") {
      await activities.completeTask({
        taskId: resolvedDecision.taskId,
        status: "approved",
        note: resolvedDecision.note,
      });

      await activities.cancelRemainingTasks(
        taskIds.filter((id) => id !== resolvedDecision.taskId),
      );

      if (stage.onApprove === "close" || stageIndex === stages.length - 1) {
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "approved",
        });
        await activities.notifySubmitterOfOutcome({
          submissionId: input.submissionId,
          submitterId: input.submitterId,
          outcome: "approved",
        });
        return;
      }

      continue;
    }

    if (resolvedDecision.decision === "reject") {
      await activities.completeTask({
        taskId: resolvedDecision.taskId,
        status: "rejected",
        note: resolvedDecision.note,
      });

      await activities.cancelRemainingTasks(
        taskIds.filter((id) => id !== resolvedDecision.taskId),
      );

      if (stage.onReject === "return-to-submitter") {
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "needs_revision",
        });
        await activities.notifySubmitterOfRevision({
          submissionId: input.submissionId,
          submitterId: input.submitterId,
          note: resolvedDecision.note,
        });
        resubmitted = false;
        await condition(() => resubmitted);
        await activities.setSubmissionStatus({
          submissionId: input.submissionId,
          status: "in_review",
        });
        stageIndex -= 1;
        continue;
      }

      if (typeof stage.onReject === "object" && stage.onReject?.goTo) {
        stageIndex = jumpToStage(stages, stage.onReject.goTo);
        continue;
      }

      await activities.setSubmissionStatus({
        submissionId: input.submissionId,
        status: "rejected",
      });
      await activities.notifySubmitterOfOutcome({
        submissionId: input.submissionId,
        submitterId: input.submitterId,
        outcome: "rejected",
        note: resolvedDecision.note,
      });
      return;
    }

    if (resolvedDecision.decision === "request-revision") {
      await activities.completeTask({
        taskId: resolvedDecision.taskId,
        status: "revision_requested",
        note: resolvedDecision.note,
      });

      await activities.cancelRemainingTasks(
        taskIds.filter((id) => id !== resolvedDecision.taskId),
      );

      await activities.setSubmissionStatus({
        submissionId: input.submissionId,
        status: "needs_revision",
      });
      await activities.notifySubmitterOfRevision({
        submissionId: input.submissionId,
        submitterId: input.submitterId,
        note: resolvedDecision.note,
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
  await activities.notifySubmitterOfOutcome({
    submissionId: input.submissionId,
    submitterId: input.submitterId,
    outcome: "approved",
  });
}

function jumpToStage(stages: WorkflowDefinition, stageId: string) {
  const index = stages.findIndex((stage) => stage.id === stageId);

  if (index === -1) {
    throw new Error(`Workflow stage "${stageId}" does not exist.`);
  }

  return index - 1;
}
