import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { GET, POST } from "../../src/app/api/submissions/route";
import {
  createApprovalTaskFixture,
  createFormFixture,
  createSensitiveFormFixture,
  createSubmissionFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  waitForApprovalTask,
  waitForSubmissionStatus,
} from "../support/fixtures";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

describe("submissions route", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("published forms create submitted submissions, start workflows, and assign approvers", async () => {
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

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Laptop access",
          },
          saveAsDraft: false,
        }),
      }),
    );

    expect(response.status).toBe(201);

    const payload = await parseJson<{ submission: { id: string; status: string } }>(response);
    expect(payload.submission.status).toBe("submitted");

    await waitForSubmissionStatus(payload.submission.id, "in_review");
    const task = await waitForApprovalTask(payload.submission.id);
    const storedSubmission = await db.submission.findUnique({
      where: { id: payload.submission.id },
    });

    expect(storedSubmission?.workflowRunId).toBe(payload.submission.id);
    expect(task?.assignedToId).toBe(approver.id);
  }, 45_000);

  test("draft submissions can be saved without a workflow", async () => {
    const { admin, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: null,
      status: "published",
    });

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Draft request",
          },
          saveAsDraft: true,
        }),
      }),
    );

    expect(response.status).toBe(201);

    const payload = await parseJson<{ submission: { id: string; status: string } }>(response);
    const storedSubmission = await db.submission.findUnique({
      where: { id: payload.submission.id },
    });

    expect(payload.submission.status).toBe("draft");
    expect(storedSubmission?.workflowRunId).toBeNull();
  });

  test("submitted forms without a workflow are rejected", async () => {
    const { admin, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: null,
      status: "published",
    });

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Blocked request",
          },
          saveAsDraft: false,
        }),
      }),
    );

    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("FORM_HAS_NO_WORKFLOW");
  });

  test("visibility and field access are role-aware", async () => {
    const { admin, approver, submitter, compliance } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const sensitiveForm = await createSensitiveFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    const ownSubmission = await createSubmissionFixture({
      formId: sensitiveForm.id,
      formVersion: sensitiveForm.version,
      submittedById: submitter.id,
      status: "submitted",
      schema: sensitiveForm.schema as never,
      data: {
        publicNote: "Visible to everyone",
        salary: 150000,
      },
    });

    await createApprovalTaskFixture({
      submissionId: ownSubmission.id,
      assignedToId: approver.id,
    });

    const unrelatedSubmission = await createSubmissionFixture({
      formId: sensitiveForm.id,
      formVersion: sensitiveForm.version,
      submittedById: admin.id,
      status: "submitted",
      schema: sensitiveForm.schema as never,
      data: {
        publicNote: "Admin only",
        salary: 200000,
      },
    });

    setMockSession(submitter);
    const submitterPayload = await parseJson<{
      submissions: Array<{ id: string; data: { publicNote: string; salary: number | null } }>;
    }>(await GET());

    expect(submitterPayload.submissions).toHaveLength(1);
    expect(submitterPayload.submissions[0]?.id).toBe(ownSubmission.id);
    expect(submitterPayload.submissions[0]?.data.publicNote).toBe("Visible to everyone");
    expect(submitterPayload.submissions[0]?.data.salary).toBeNull();

    setMockSession(approver);
    const approverPayload = await parseJson<{
      submissions: Array<{ id: string; data: { salary: number | null } }>;
    }>(await GET());

    expect(approverPayload.submissions.map((item) => item.id)).toContain(ownSubmission.id);
    expect(approverPayload.submissions.map((item) => item.id)).not.toContain(unrelatedSubmission.id);
    expect(
      approverPayload.submissions.find((item) => item.id === ownSubmission.id)?.data.salary,
    ).toBeNull();

    setMockSession(compliance);
    const compliancePayload = await parseJson<{
      submissions: Array<{ id: string; data: { salary: number | null } }>;
    }>(await GET());

    expect(compliancePayload.submissions.map((item) => item.id)).toEqual(
      expect.arrayContaining([ownSubmission.id, unrelatedSubmission.id]),
    );
    expect(
      compliancePayload.submissions.find((item) => item.id === ownSubmission.id)?.data.salary,
    ).toBe(150000);
  });
});
