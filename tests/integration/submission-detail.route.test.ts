import { beforeEach, describe, expect, test, vi } from "vitest";
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

import { PATCH } from "../../src/app/api/submissions/[id]/route";

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
});
