import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { POST } from "../../src/app/api/workflows/route";
import { PUT } from "../../src/app/api/workflows/[id]/route";
import {
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
} from "../support/fixtures";
import { createMutationRequestHeaders } from "../support/mutation";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

describe("workflows route", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("workflow creation rejects goTo targets that do not exist", async () => {
    const { admin, approver } = await seedBaseUsers();
    setMockSession(admin);

    const response = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "Broken goTo workflow",
          definition: [
            {
              id: "approval-1",
              name: "Approval",
              type: "approval",
              assignTo: { type: "user", value: approver.id },
              onApprove: "close",
              onReject: { goTo: "missing-stage" },
            },
          ],
        }),
      }),
    );

    const payload = await parseJson<{ error: { code: string; message: string } }>(response);

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("WORKFLOW_INVALID");
    expect(payload.error.message).toContain("missing-stage");
  });

  test("workflow creation rejects deactivated direct-user targets", async () => {
    const { admin, approver } = await seedBaseUsers();
    await db.user.update({
      where: { id: approver.id },
      data: { deactivatedAt: new Date() },
    });
    setMockSession(admin);

    const response = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "Deactivated approver workflow",
          definition: [
            {
              id: "approval-1",
              name: "Approval",
              type: "approval",
              assignTo: { type: "user", value: approver.id },
              onApprove: "close",
              onReject: "close",
            },
          ],
        }),
      }),
    );

    const payload = await parseJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("USER_DEACTIVATED");
  });

  test("workflow creation rejects missing role targets", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const response = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "Missing role workflow",
          definition: [
            {
              id: "approval-1",
              name: "Approval",
              type: "approval",
              assignTo: { type: "role", value: "review-board" },
              onApprove: "close",
              onReject: "close",
            },
          ],
        }),
      }),
    );

    const payload = await parseJson<{ error: { code: string; message: string } }>(response);

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("ROLE_NOT_FOUND");
    expect(payload.error.message).toContain("review-board");
  });

  test("workflow updates reject missing role targets", async () => {
    const { admin, approver } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    setMockSession(admin);

    const response = await PUT(
      new Request(`http://localhost/api/workflows/${workflow.id}`, {
        method: "PUT",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "Updated workflow",
          definition: [
            {
              id: "approval-1",
              name: "Approval",
              type: "approval",
              assignTo: { type: "role", value: "finance-committee" },
              onApprove: "close",
              onReject: "close",
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: workflow.id }) },
    );

    const payload = await parseJson<{ error: { code: string; message: string } }>(response);

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("ROLE_NOT_FOUND");
    expect(payload.error.message).toContain("finance-committee");
  });
});
