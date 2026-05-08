import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { POST as createSubmission } from "../../src/app/api/submissions/route";
import { PATCH as updateSubmission } from "../../src/app/api/submissions/[id]/route";
import { POST as approveSubmission } from "../../src/app/api/submissions/[id]/approve/route";
import { POST as rejectSubmission } from "../../src/app/api/submissions/[id]/reject/route";
import { POST as reviseSubmission } from "../../src/app/api/submissions/[id]/revise/route";
import {
  createFormFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  waitForApprovalTask,
  waitForSubmissionStatus,
} from "../support/fixtures";
import { waitFor } from "../support/polling";
import { setMockSession } from "../support/vitest.setup";

describe("workflow integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("submitted forms can be approved end-to-end", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    setMockSession(submitter);
    const createResponse = await createSubmission(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Approve me",
          },
          saveAsDraft: false,
        }),
      }),
    );

    const created = (await createResponse.json()) as { submission: { id: string } };
    const task = await waitForApprovalTask(created.submission.id);
    expect(task).not.toBeNull();

    setMockSession(approver);
    const approveResponse = await approveSubmission(
      new Request(`http://localhost/api/submissions/${created.submission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task!.id,
          note: "Ship it",
        }),
      }),
      { params: Promise.resolve({ id: created.submission.id }) },
    );

    expect(approveResponse.status).toBe(200);

    await waitForSubmissionStatus(created.submission.id, "closed");
    const storedTask = await db.approvalTask.findUnique({
      where: { id: task!.id },
    });

    expect(storedTask?.status).toBe("approved");
  }, 60_000);

  test("revision requests return the submission to the owner and restart review on resubmission", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    setMockSession(submitter);
    const createResponse = await createSubmission(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Needs work",
          },
          saveAsDraft: false,
        }),
      }),
    );
    const created = (await createResponse.json()) as { submission: { id: string } };
    const originalTask = await waitForApprovalTask(created.submission.id);

    setMockSession(approver);
    const reviseResponse = await reviseSubmission(
      new Request(`http://localhost/api/submissions/${created.submission.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: originalTask!.id,
          note: "Add more detail",
        }),
      }),
      { params: Promise.resolve({ id: created.submission.id }) },
    );

    expect(reviseResponse.status).toBe(200);
    await waitForSubmissionStatus(created.submission.id, "needs_revision");

    setMockSession(submitter);
    const resubmitResponse = await updateSubmission(
      new Request(`http://localhost/api/submissions/${created.submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            requestTitle: "Needs work, now fixed",
          },
        }),
      }),
      { params: Promise.resolve({ id: created.submission.id }) },
    );

    expect(resubmitResponse.status).toBe(200);
    await waitForSubmissionStatus(created.submission.id, "in_review");

    const replacementTask = await waitFor(
      async () => {
        const task = await db.approvalTask.findFirst({
          where: {
            submissionId: created.submission.id,
            status: "pending",
            id: { not: originalTask!.id },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return task;
      },
      { label: `replacement approval task for ${created.submission.id}` },
    );

    expect(replacementTask).not.toBeNull();

    setMockSession(approver);
    await approveSubmission(
      new Request(`http://localhost/api/submissions/${created.submission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: replacementTask!.id,
        }),
      }),
      { params: Promise.resolve({ id: created.submission.id }) },
    );

    await waitForSubmissionStatus(created.submission.id, "closed");

    const originalStoredTask = await db.approvalTask.findUnique({
      where: { id: originalTask!.id },
    });
    const replacementStoredTask = await db.approvalTask.findUnique({
      where: { id: replacementTask!.id },
    });

    expect(originalStoredTask?.status).toBe("revision_requested");
    expect(replacementStoredTask?.status).toBe("approved");
  }, 60_000);

  test("rejections close the workflow as rejected", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    setMockSession(submitter);
    const createResponse = await createSubmission(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Reject me",
          },
          saveAsDraft: false,
        }),
      }),
    );
    const created = (await createResponse.json()) as { submission: { id: string } };
    const task = await waitForApprovalTask(created.submission.id);

    setMockSession(approver);
    const rejectResponse = await rejectSubmission(
      new Request(`http://localhost/api/submissions/${created.submission.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task!.id,
          note: "Not enough detail",
        }),
      }),
      { params: Promise.resolve({ id: created.submission.id }) },
    );

    expect(rejectResponse.status).toBe(200);
    await waitForSubmissionStatus(created.submission.id, "closed");

    const storedTask = await db.approvalTask.findUnique({
      where: { id: task!.id },
    });

    expect(storedTask?.status).toBe("rejected");
  }, 60_000);
});
