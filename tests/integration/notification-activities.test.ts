import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import {
  createFormFixture,
  createSubmissionFixture,
  resetDatabase,
  seedBaseUsers,
} from "../support/fixtures";
import {
  createApprovalTasks,
  markTaskOverdueIfPending,
  sendReminderIfTaskPending,
} from "../../src/temporal/activities/approvalActivities";

describe("notification-backed approval activities", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("creating approval tasks also creates in-app notifications", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      status: "published",
    });
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "submitted",
    });

    const taskIds = await createApprovalTasks({
      submissionId: submission.id,
      stageIndex: 0,
      assigneeIds: [approver.id],
    });

    const task = await db.approvalTask.findUnique({
      where: { id: taskIds[0] },
    });
    const notification = await db.notification.findFirst({
      where: {
        userId: approver.id,
        type: "task_assigned",
        linkUrl: `/submissions/${submission.id}`,
      },
    });

    expect(task?.assignedToId).toBe(approver.id);
    expect(notification?.title).toBe("New approval task");
  });

  test("reminders only notify while a task is still pending", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      status: "published",
    });
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "in_review",
    });
    const pendingTask = await db.approvalTask.create({
      data: {
        submissionId: submission.id,
        assignedToId: approver.id,
        stageIndex: 0,
      },
    });
    const approvedTask = await db.approvalTask.create({
      data: {
        submissionId: submission.id,
        assignedToId: approver.id,
        stageIndex: 1,
        status: "approved",
      },
    });

    await sendReminderIfTaskPending(pendingTask.id);
    await sendReminderIfTaskPending(approvedTask.id);

    const reminders = await db.notification.findMany({
      where: {
        userId: approver.id,
        type: "sla_reminder",
      },
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.linkUrl).toBe(`/submissions/${submission.id}`);
  });

  test("overdue tasks notify the assignee and admins", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      status: "published",
    });
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "in_review",
    });
    const task = await db.approvalTask.create({
      data: {
        submissionId: submission.id,
        assignedToId: approver.id,
        stageIndex: 0,
      },
    });

    await markTaskOverdueIfPending(task.id);

    const approverNotification = await db.notification.findFirst({
      where: {
        userId: approver.id,
        type: "task_overdue",
      },
    });
    const adminNotification = await db.notification.findFirst({
      where: {
        userId: admin.id,
        type: "task_overdue_admin",
      },
    });

    expect(approverNotification?.linkUrl).toBe(`/submissions/${submission.id}`);
    expect(adminNotification?.linkUrl).toBe(`/submissions/${submission.id}`);
  });
});
