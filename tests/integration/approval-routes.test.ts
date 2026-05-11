import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "../../src/lib/db";
import {
  createApprovalTaskFixture,
  createFormFixture,
  createSubmissionFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
} from "../support/fixtures";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";
import {
  approvalDecisionSignal,
} from "../../src/temporal/workflows/approvalWorkflow";

const signalMock = vi.fn();

vi.mock("@/lib/temporal", () => ({
  getTemporalClient: async () => ({
    workflow: {
      getHandle: () => ({
        signal: signalMock,
      }),
    },
  }),
}));

import { POST as approveRoute } from "../../src/app/api/submissions/[id]/approve/route";
import { POST as rejectRoute } from "../../src/app/api/submissions/[id]/reject/route";
import { POST as reviseRoute } from "../../src/app/api/submissions/[id]/revise/route";

describe("approval signal routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    signalMock.mockReset();
  });

  test("non-approvers cannot signal decisions", async () => {
    const { submitter } = await seedBaseUsers();
    setMockSession(submitter);

    const response = await approveRoute(
      new Request("http://localhost/api/submissions/submission-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
        body: JSON.stringify({
          taskId: crypto.randomUUID(),
        }),
      }),
      { params: Promise.resolve({ id: "submission-1" }) },
    );

    expect(response.status).toBe(403);
    expect(signalMock).not.toHaveBeenCalled();
  });

  test.each([
    ["approve", approveRoute, "approve", "submission.approved"],
    ["reject", rejectRoute, "reject", "submission.rejected"],
    ["revise", reviseRoute, "request-revision", "submission.revision_requested"],
  ] as const)(
    "%s routes send the expected Temporal signal and audit log",
    async (_label, route, decision, action) => {
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
        status: "in_review",
        workflowRunId: crypto.randomUUID(),
      });
      const task = await createApprovalTaskFixture({
        submissionId: submission.id,
        assignedToId: approver.id,
      });

      setMockSession(approver);

      const response = await route(
        new Request(`http://localhost/api/submissions/${submission.id}/${decision}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
          body: JSON.stringify({
            taskId: task.id,
            note: "Reviewed in test",
          }),
        }),
        { params: Promise.resolve({ id: submission.id }) },
      );

      expect(response.status).toBe(200);
      expect(signalMock).toHaveBeenCalledWith(approvalDecisionSignal, {
        taskId: task.id,
        decision,
        note: "Reviewed in test",
      });

      const auditLog = await db.auditLog.findFirst({
        where: {
          resourceType: "submission",
          resourceId: submission.id,
          action,
        },
      });

      expect(auditLog?.actorId).toBe(approver.id);
      const payload = await parseJson<{ ok: boolean }>(response);
      expect(payload.ok).toBe(true);
    },
  );

  test("decision routes accept an omitted note", async () => {
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
      status: "in_review",
      workflowRunId: crypto.randomUUID(),
    });
    const task = await createApprovalTaskFixture({
      submissionId: submission.id,
      assignedToId: approver.id,
    });

    setMockSession(approver);

    const response = await approveRoute(
      new Request(`http://localhost/api/submissions/${submission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
        body: JSON.stringify({
          taskId: task.id,
        }),
      }),
      { params: Promise.resolve({ id: submission.id }) },
    );

    expect(response.status).toBe(200);

    const auditLog = await db.auditLog.findFirstOrThrow({
      where: {
        resourceType: "submission",
        resourceId: submission.id,
        action: "submission.approved",
      },
    });

    expect(auditLog.metadata).toEqual({
      taskId: task.id,
    });
  });

  test("approvers cannot act on another approver's pending task", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const secondApprover = await db.user.create({
      data: {
        email: "backup-approver@example.com",
        name: "Backup Approver",
        roles: ["approver"],
      },
    });
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: secondApprover.id,
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
      status: "in_review",
      workflowRunId: crypto.randomUUID(),
    });
    const task = await createApprovalTaskFixture({
      submissionId: submission.id,
      assignedToId: secondApprover.id,
    });

    setMockSession(approver);

    const response = await approveRoute(
      new Request(`http://localhost/api/submissions/${submission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
        body: JSON.stringify({
          taskId: task.id,
        }),
      }),
      { params: Promise.resolve({ id: submission.id }) },
    );

    expect(response.status).toBe(403);
    expect(signalMock).not.toHaveBeenCalled();
  });
});
