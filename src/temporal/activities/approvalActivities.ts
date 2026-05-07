import { db } from "@/lib/db";
import { sendNotification } from "./notificationActivities";

export async function markSubmissionInReview(submissionId: string) {
  await db.submission.update({
    where: { id: submissionId },
    data: { status: "in_review" },
  });
}

export async function createApprovalTasks(input: {
  submissionId: string;
  stageIndex: number;
  assigneeIds: string[];
  dueAt?: string;
}) {
  const tasks = [];

  for (const assignedToId of input.assigneeIds) {
    const task = await db.approvalTask.create({
      data: {
        submissionId: input.submissionId,
        stageIndex: input.stageIndex,
        assignedToId,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      },
    });

    await sendNotification({
      userId: assignedToId,
      type: "task_assigned",
      title: "New approval task",
      body: "A submission is waiting for your review.",
      linkUrl: `/submissions/${input.submissionId}`,
      email: true,
    });

    tasks.push(task);
  }

  return tasks.map((task) => task.id);
}

export async function completeTask(input: {
  taskId: string;
  status: "approved" | "rejected" | "revision_requested";
  note?: string;
}) {
  await db.approvalTask.update({
    where: { id: input.taskId },
    data: {
      status: input.status,
      note: input.note,
      decisionAt: new Date(),
    },
  });
}

export async function cancelRemainingTasks(taskIds: string[]) {
  const tasks = await db.approvalTask.findMany({
    where: {
      id: { in: taskIds },
      status: "pending",
    },
  });

  await db.approvalTask.updateMany({
    where: {
      id: { in: tasks.map((task) => task.id) },
      status: "pending",
    },
    data: {
      status: "cancelled",
    },
  });

  for (const task of tasks) {
    await sendNotification({
      userId: task.assignedToId,
      type: "parallel_task_cancelled",
      title: "Approval task resolved",
      body: "Another approver has already completed this stage.",
      linkUrl: `/submissions/${task.submissionId}`,
      email: false,
    });
  }
}

export async function setSubmissionStatus(input: {
  submissionId: string;
  status:
    | "submitted"
    | "in_review"
    | "needs_revision"
    | "approved"
    | "rejected"
    | "closed";
}) {
  await db.submission.update({
    where: { id: input.submissionId },
    data: { status: input.status },
  });
}

export async function getWorkflowForSubmission(input: {
  workflowId: string;
}) {
  const workflow = await db.workflow.findUnique({
    where: {
      id: input.workflowId,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found.");
  }

  return workflow.definition as unknown[];
}
