import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { POST as approveSubmission } from "../../src/app/api/submissions/[id]/approve/route";
import { POST as rejectSubmission } from "../../src/app/api/submissions/[id]/reject/route";
import { POST as requestRevision } from "../../src/app/api/submissions/[id]/revise/route";
import { PATCH as updateSubmission } from "../../src/app/api/submissions/[id]/route";
import { POST as createSubmission } from "../../src/app/api/submissions/route";
import {
  createFormFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  waitForApprovalTask,
  waitForSubmissionStatus,
} from "../support/fixtures";
import { waitFor } from "../support/polling";
import { parseJson } from "../support/response";
import { clearMockSession, setMockSession } from "../support/vitest.setup";

describe("approval flow integration", () => {
  beforeEach(() => {
    clearMockSession();
  });

  async function createSubmittedCase() {
    await resetDatabase();
    const users = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: users.admin.id,
      approverId: users.approver.id,
      name: "Approval flow",
    });
    const form = await createFormFixture({
      createdById: users.admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    setMockSession({
      id: users.submitter.id,
      email: users.submitter.email,
      name: users.submitter.name,
      roles: users.submitter.roles,
    });

    const response = await createSubmission(
      new Request("http://test.local/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Approval flow request",
          },
          saveAsDraft: false,
        }),
      }),
    );

    expect(response.status).toBe(201);
    const payload = await parseJson<{ submission: { id: string } }>(response);
    const task = await waitForApprovalTask(payload.submission.id);
    await waitForSubmissionStatus(payload.submission.id, "in_review");

    return { ...users, workflow, form, submissionId: payload.submission.id, taskId: task.id };
  }

  test("approver can approve a submitted form and close the submission", async () => {
    const caseData = await createSubmittedCase();

    setMockSession({
      id: caseData.approver.id,
      email: caseData.approver.email,
      name: caseData.approver.name,
      roles: caseData.approver.roles,
    });

    const response = await approveSubmission(
      new Request("http://test.local/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: caseData.taskId,
          note: "Approved in test",
        }),
      }),
      { params: Promise.resolve({ id: caseData.submissionId }) },
    );

    expect(response.status).toBe(200);
    await waitForSubmissionStatus(caseData.submissionId, "closed");

    const task = await db.approvalTask.findUnique({
      where: { id: caseData.taskId },
    });
    expect(task?.status).toBe("approved");

    const auditLog = await db.auditLog.findFirst({
      where: {
        action: "submission.approved",
        resourceId: caseData.submissionId,
      },
    });
    expect(auditLog).not.toBeNull();
  });

  test("approver can reject a submission", async () => {
    const caseData = await createSubmittedCase();

    setMockSession({
      id: caseData.approver.id,
      email: caseData.approver.email,
      name: caseData.approver.name,
      roles: caseData.approver.roles,
    });

    const response = await rejectSubmission(
      new Request("http://test.local/api/submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: caseData.taskId,
          note: "Rejected in test",
        }),
      }),
      { params: Promise.resolve({ id: caseData.submissionId }) },
    );

    expect(response.status).toBe(200);
    await waitForSubmissionStatus(caseData.submissionId, "closed");

    const task = await db.approvalTask.findUnique({
      where: { id: caseData.taskId },
    });
    expect(task?.status).toBe("rejected");
  });

  test("revision requests move the submission back into review after resubmission", async () => {
    const caseData = await createSubmittedCase();

    setMockSession({
      id: caseData.approver.id,
      email: caseData.approver.email,
      name: caseData.approver.name,
      roles: caseData.approver.roles,
    });

    const reviseResponse = await requestRevision(
      new Request("http://test.local/api/submissions/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: caseData.taskId,
          note: "Needs more detail",
        }),
      }),
      { params: Promise.resolve({ id: caseData.submissionId }) },
    );

    expect(reviseResponse.status).toBe(200);
    await waitForSubmissionStatus(caseData.submissionId, "needs_revision");

    setMockSession({
      id: caseData.submitter.id,
      email: caseData.submitter.email,
      name: caseData.submitter.name,
      roles: caseData.submitter.roles,
    });

    const resubmitResponse = await updateSubmission(
      new Request("http://test.local/api/submissions/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            requestTitle: "Revised request",
          },
        }),
      }),
      { params: Promise.resolve({ id: caseData.submissionId }) },
    );

    expect(resubmitResponse.status).toBe(200);
    await waitForSubmissionStatus(caseData.submissionId, "in_review");

    const nextTask = await waitFor(
      async () => {
        const tasks = await db.approvalTask.findMany({
          where: {
            submissionId: caseData.submissionId,
            status: "pending",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return tasks[0] && tasks[0].id !== caseData.taskId ? tasks[0] : null;
      },
      { label: "resubmitted approval task" },
    );

    setMockSession({
      id: caseData.approver.id,
      email: caseData.approver.email,
      name: caseData.approver.name,
      roles: caseData.approver.roles,
    });

    const approveResponse = await approveSubmission(
      new Request("http://test.local/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: nextTask.id,
          note: "Approved after revision",
        }),
      }),
      { params: Promise.resolve({ id: caseData.submissionId }) },
    );

    expect(approveResponse.status).toBe(200);
    await waitForSubmissionStatus(caseData.submissionId, "closed");

    const revisionAudit = await db.auditLog.findFirst({
      where: {
        action: "submission.resubmitted",
        resourceId: caseData.submissionId,
      },
    });
    expect(revisionAudit).not.toBeNull();
  });

  test("submitters cannot signal approval routes", async () => {
    const caseData = await createSubmittedCase();

    setMockSession({
      id: caseData.submitter.id,
      email: caseData.submitter.email,
      name: caseData.submitter.name,
      roles: caseData.submitter.roles,
    });

    const response = await approveSubmission(
      new Request("http://test.local/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: caseData.taskId,
        }),
      }),
      { params: Promise.resolve({ id: caseData.submissionId }) },
    );

    expect(response.status).toBe(403);
  });
});
