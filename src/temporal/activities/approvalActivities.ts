import { db } from "@/lib/db";
import { resolveDelegateOrSelf } from "@/lib/delegation";
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
  const effectiveAssigneeIds = new Set<string>();

  for (const assignedToId of input.assigneeIds) {
    const effectiveAssigneeId = await resolveDelegateOrSelf(assignedToId);
    if (effectiveAssigneeIds.has(effectiveAssigneeId)) continue;
    effectiveAssigneeIds.add(effectiveAssigneeId);

    const task = await db.approvalTask.create({
      data: {
        submissionId: input.submissionId,
        stageIndex: input.stageIndex,
        assignedToId: effectiveAssigneeId,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      },
    });

    await sendNotification({
      userId: effectiveAssigneeId,
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

export async function sendReminderIfTaskPending(taskId: string) {
  const task = await db.approvalTask.findUnique({
    where: { id: taskId },
  });

  if (!task || task.status !== "pending") return;

  await sendNotification({
    userId: task.assignedToId,
    type: "sla_reminder",
    title: "Approval reminder",
    body: "You still have an approval task waiting.",
    linkUrl: `/submissions/${task.submissionId}`,
    email: true,
  });
}

export async function markTaskOverdueIfPending(taskId: string) {
  const task = await db.approvalTask.findUnique({
    where: { id: taskId },
  });

  if (!task || task.status !== "pending") return;

  await sendNotification({
    userId: task.assignedToId,
    type: "task_overdue",
    title: "Approval task overdue",
    body: "Your approval task is overdue.",
    linkUrl: `/submissions/${task.submissionId}`,
    email: true,
  });

  const admins = await db.user.findMany({
    where: {
      roles: {
        has: "admin",
      },
    },
  });

  for (const admin of admins) {
    await sendNotification({
      userId: admin.id,
      type: "task_overdue_admin",
      title: "Approval task overdue",
      body: "An approval task is overdue and may require reassignment.",
      linkUrl: `/submissions/${task.submissionId}`,
      email: true,
    });
  }
}
