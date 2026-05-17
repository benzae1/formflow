import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { POST } from "../../src/app/api/workflows/route";
import {
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
});
