import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "../../src/lib/db";
import {
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
        headers: { "Content-Type": "application/json" },
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
      const { approver } = await seedBaseUsers();
      const submissionId = crypto.randomUUID();
      const taskId = crypto.randomUUID();

      setMockSession(approver);

      const response = await route(
        new Request(`http://localhost/api/submissions/${submissionId}/${decision}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            note: "Reviewed in test",
          }),
        }),
        { params: Promise.resolve({ id: submissionId }) },
      );

      expect(response.status).toBe(200);
      expect(signalMock).toHaveBeenCalledWith(approvalDecisionSignal, {
        taskId,
        decision,
        note: "Reviewed in test",
      });

      const auditLog = await db.auditLog.findFirst({
        where: {
          resourceType: "submission",
          resourceId: submissionId,
          action,
        },
      });

      expect(auditLog?.actorId).toBe(approver.id);
      const payload = await parseJson<{ ok: boolean }>(response);
      expect(payload.ok).toBe(true);
    },
  );

  test("decision routes accept an omitted note", async () => {
    const { approver } = await seedBaseUsers();
    const submissionId = crypto.randomUUID();
    const taskId = crypto.randomUUID();

    setMockSession(approver);

    const response = await approveRoute(
      new Request(`http://localhost/api/submissions/${submissionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
        }),
      }),
      { params: Promise.resolve({ id: submissionId }) },
    );

    expect(response.status).toBe(200);

    const auditLog = await db.auditLog.findFirstOrThrow({
      where: {
        resourceType: "submission",
        resourceId: submissionId,
        action: "submission.approved",
      },
    });

    expect(auditLog.metadata).toEqual({
      taskId,
    });
  });
});
