import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { PATCH as updateRolesRoute } from "../../src/app/api/users/[id]/roles/route";
import { POST as createDelegationRoute } from "../../src/app/api/delegations/route";
import { DELETE as deleteDelegationRoute } from "../../src/app/api/delegations/[id]/route";
import { resetDatabase, seedBaseUsers } from "../support/fixtures";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

describe("user and delegation management routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("admins can update user roles", async () => {
    const { admin, submitter } = await seedBaseUsers();
    setMockSession(admin);

    const response = await updateRolesRoute(
      new Request(`http://localhost/api/users/${submitter.id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
        body: JSON.stringify({
          roles: ["submitter", "approver"],
        }),
      }),
      { params: Promise.resolve({ id: submitter.id }) },
    );

    expect(response.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({
      where: { id: submitter.id },
    });

    expect(updated.roles).toEqual(["submitter", "approver"]);
  });

  test("approvers can manage their own delegation windows", async () => {
    const { approver } = await seedBaseUsers();
    const backupApprover = await db.user.create({
      data: {
        email: "delegate@example.com",
        name: "Delegate User",
        roles: ["approver"],
      },
    });

    setMockSession(approver);

    const createResponse = await createDelegationRoute(
      new Request("http://localhost/api/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
        body: JSON.stringify({
          approverId: approver.id,
          delegateId: backupApprover.id,
          startsAt: "2026-05-12T09:00:00.000Z",
          endsAt: "2026-05-14T17:00:00.000Z",
        }),
      }),
    );

    expect(createResponse.status).toBe(201);

    const payload = await parseJson<{ delegation: { id: string } }>(createResponse);

    const deleteResponse = await deleteDelegationRoute(
      new Request(`http://localhost/api/delegations/${payload.delegation.id}`, {
        method: "DELETE",
        headers: { "x-formflow-intent": "mutation" },
      }),
      { params: Promise.resolve({ id: payload.delegation.id }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(
      await db.delegation.findUnique({
        where: { id: payload.delegation.id },
      }),
    ).toBeNull();
  });

  test("approvers cannot create delegation windows for other approvers", async () => {
    const { approver } = await seedBaseUsers();
    const anotherApprover = await db.user.create({
      data: {
        email: "another-approver@example.com",
        name: "Another Approver",
        roles: ["approver"],
      },
    });
    const delegate = await db.user.create({
      data: {
        email: "delegate@example.com",
        name: "Delegate User",
        roles: ["approver"],
      },
    });

    setMockSession(approver);

    const response = await createDelegationRoute(
      new Request("http://localhost/api/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-formflow-intent": "mutation" },
        body: JSON.stringify({
          approverId: anotherApprover.id,
          delegateId: delegate.id,
          startsAt: "2026-05-12T09:00:00.000Z",
          endsAt: "2026-05-14T17:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
