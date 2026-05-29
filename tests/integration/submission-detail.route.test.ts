import { beforeEach, describe, expect, test, vi } from "vitest";
import { createSensitiveFormFixture } from "../support/fixtures";
import {
  createFormFixture,
  createSubmissionFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
} from "../support/fixtures";
import { createMutationRequestHeaders } from "../support/mutation";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";
import { buildSensitiveAccessCookie, getSensitiveAccessScope } from "../../src/lib/sensitive-access";

const signalMock = vi.fn();
const startWorkflowMock = vi.fn();
const terminateWorkflowMock = vi.fn();

vi.mock("@/lib/temporal", () => ({
  getTemporalClient: async () => ({
    workflow: {
      start: startWorkflowMock,
      getHandle: () => ({
        signal: signalMock,
        terminate: terminateWorkflowMock,
      }),
    },
  }),
}));

import { GET, PATCH } from "../../src/app/api/submissions/[id]/route";

describe("submission detail route", () => {
  beforeEach(async () => {
    await resetDatabase();
    signalMock.mockReset();
    startWorkflowMock.mockReset();
    terminateWorkflowMock.mockReset();
  });

  test("saving a needs_revision submission does not resubmit the workflow", async () => {
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
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "needs_revision",
    });

    setMockSession(submitter);

    const response = await PATCH(
      new Request(`http://localhost/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          data: { requestTitle: "Saved without resubmitting" },
        }),
      }),
      { params: Promise.resolve({ id: submission.id }) },
    );

    expect(response.status).toBe(200);
    expect(signalMock).not.toHaveBeenCalled();

    const payload = await parseJson<{ submission: { status: string } }>(response);
    expect(payload.submission.status).toBe("needs_revision");
  });

  test("explicitly submitting a needs_revision submission signals the workflow", async () => {
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
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "needs_revision",
    });

    setMockSession(submitter);

    const response = await PATCH(
      new Request(`http://localhost/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          data: { requestTitle: "Resubmitted revision" },
          submit: true,
        }),
      }),
      { params: Promise.resolve({ id: submission.id }) },
    );

    expect(response.status).toBe(200);
    expect(signalMock).toHaveBeenCalledWith(expect.anything());
  });

  test("sensitive submission reads require a signed grant", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const form = await createSensitiveFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "submitted",
      schema: form.schema as never,
      data: {
        publicNote: "Restricted",
        salary: 101000,
      },
    });

    setMockSession(admin);

    const response = await GET(
      new Request(`http://localhost/api/submissions/${submission.id}`),
      { params: Promise.resolve({ id: submission.id }) },
    );
    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(428);
    expect(payload.error.code).toBe("BREAK_GLASS_REQUIRED");
  });

  test("sensitive submission reads accept the same signed grant as the page flow", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const form = await createSensitiveFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "submitted",
      schema: form.schema as never,
      data: {
        publicNote: "Restricted",
        salary: 101000,
      },
    });

    setMockSession(admin);
    const sensitiveCookie = buildSensitiveAccessCookie({
      actorId: admin.id,
      scope: getSensitiveAccessScope({ kind: "submission", id: submission.id }),
      reason: "Incident review 2026-004",
    }).split(";", 1)[0];

    const response = await GET(
      new Request(`http://localhost/api/submissions/${submission.id}`, {
        headers: {
          cookie: sensitiveCookie,
        },
      }),
      { params: Promise.resolve({ id: submission.id }) },
    );
    const payload = await parseJson<{
      submission: { id: string; data: { salary: number } };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.submission.id).toBe(submission.id);
    expect(payload.submission.data.salary).toBe(101000);
  });
});
