import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveDelegateOrSelf } from "@/lib/delegation";
import { decryptSubmissionData } from "@/lib/formio-data";
import { logger } from "@/lib/logger";
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
  const seenAssigneeIds = new Set<string>();

  for (const assignedToId of input.assigneeIds) {
    if (seenAssigneeIds.has(assignedToId)) continue;
    seenAssigneeIds.add(assignedToId);

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

  const delegateId = await resolveDelegateOrSelf(task.assignedToId);
  const hasDelegation = delegateId !== task.assignedToId;

  if (hasDelegation) {
    await db.approvalTask.update({
      where: { id: taskId },
      data: { assignedToId: delegateId },
    });
    logger.info({ taskId, originalId: task.assignedToId, delegateId }, "Task SLA breached — reassigned to delegate");

    await sendNotification({
      userId: delegateId,
      type: "task_assigned",
      title: "Approval task delegated to you",
      body: "The primary approver's SLA has elapsed. This task is now assigned to you.",
      linkUrl: `/submissions/${task.submissionId}`,
      email: true,
    });
  } else {
    await sendNotification({
      userId: task.assignedToId,
      type: "task_overdue",
      title: "Approval task overdue",
      body: "Your approval task is overdue.",
      linkUrl: `/submissions/${task.submissionId}`,
      email: true,
    });
  }

  const admins = await db.user.findMany({
    where: {
      roles: {
        some: {
          name: "admin",
        },
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

export async function sendStageNotification(input: {
  submissionId: string;
  userIds: string[];
  stageName: string;
}) {
  for (const userId of input.userIds) {
    await sendNotification({
      userId,
      type: "workflow_stage_notification",
      title: input.stageName,
      body: "A workflow stage generated a notification for this submission.",
      linkUrl: `/submissions/${input.submissionId}`,
      email: true,
    });
  }
}

export async function notifySubmitterOfRevision(input: {
  submissionId: string;
  submitterId: string;
  note?: string;
}) {
  await sendNotification({
    userId: input.submitterId,
    type: "submission_revision_requested",
    title: "Revision requested",
    body: "An approver requested changes to your submission. Open FormFlow to review the details.",
    linkUrl: `/submissions/${input.submissionId}`,
    email: true,
  });
}

export async function notifySubmitterOfOutcome(input: {
  submissionId: string;
  submitterId: string;
  outcome: "approved" | "rejected";
  note?: string;
}) {
  await sendNotification({
    userId: input.submitterId,
    type: `submission_${input.outcome}`,
    title:
      input.outcome === "approved"
        ? "Submission approved"
        : "Submission rejected",
    body:
      input.outcome === "approved"
        ? "Your submission completed successfully."
        : "Your submission was rejected. Open FormFlow to review the details.",
    linkUrl: `/submissions/${input.submissionId}`,
    email: true,
  });
}

export async function getSubmissionWorkflowContext(submissionId: string) {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: {
      form: true,
      submittedBy: {
        include: {
          roles: true,
          memberships: {
            include: {
              orgUnit: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  return {
    data: decryptSubmissionData(submission.data as Record<string, unknown>),
    form: {
      id: submission.form.id,
      sensitivity: submission.form.sensitivity,
      slug: submission.form.slug,
      title: submission.form.title,
    },
    submitter: {
      id: submission.submittedBy.id,
      roles: submission.submittedBy.roles.map((role) => role.name),
      orgUnits: submission.submittedBy.memberships.map((membership) => ({
        id: membership.orgUnit.id,
        name: membership.orgUnit.name,
        type: membership.orgUnit.type,
        parentId: membership.orgUnit.parentId,
        roleInUnit: membership.roleInUnit,
        isManager: membership.isManager,
      })),
    },
  };
}

export async function createChildSubmission(input: {
  parentSubmissionId: string;
  childFormId: string;
  submitterId: string;
}) {
  const childForm = await db.form.findUnique({
    where: { id: input.childFormId },
    include: {
      workflow: true,
    },
  });

  if (!childForm) {
    throw new Error("Child form not found.");
  }

  const childSubmission = await db.submission.create({
    data: {
      formId: childForm.id,
      formVersion: childForm.version,
      formSchemaSnapshot: childForm.schema as Prisma.InputJsonValue,
      submittedById: input.submitterId,
      data: {},
      status: "draft",
      workflowId: childForm.workflow?.id ?? null,
      workflowVersion: childForm.workflow?.version ?? null,
      workflowDefinition: childForm.workflow
        ? (childForm.workflow.definition as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      parentSubmissionId: input.parentSubmissionId,
    },
  });

  await sendNotification({
    userId: input.submitterId,
    type: "child_form_created",
    title: "Additional form required",
    body: "Please complete the linked follow-up form.",
    linkUrl: `/submissions/${childSubmission.id}`,
    email: true,
  });

  return childSubmission.id;
}
