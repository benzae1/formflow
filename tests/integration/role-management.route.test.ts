import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test } from "vitest";
import { DELETE as deleteRoleRoute, PUT as updateRoleRoute } from "../../src/app/api/roles/[id]/route";
import { GET as listRolesRoute, POST as createRoleRoute } from "../../src/app/api/roles/route";
import { db } from "../../src/lib/db";
import { createMutationRequestHeaders } from "../support/mutation";
import { createFormFixture, seedBaseUsers, resetDatabase } from "../support/fixtures";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

describe("role management routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("admins can list, create, update, and delete custom roles with audit events", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const createResponse = await createRoleRoute(
      new Request("http://localhost/api/roles", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "review-board",
          label: "Review Board",
        }),
      }),
    );

    expect(createResponse.status).toBe(201);

    const createdPayload = await parseJson<{
      role: { id: string; name: string; label: string; protected: boolean };
    }>(createResponse);
    expect(createdPayload.role).toMatchObject({
      name: "review-board",
      label: "Review Board",
      protected: false,
    });

    const listResponse = await listRolesRoute();
    expect(listResponse.status).toBe(200);

    const listPayload = await parseJson<{
      roles: Array<{ name: string; protected: boolean }>;
    }>(listResponse);
    expect(listPayload.roles.some((role) => role.name === "review-board")).toBe(true);
    expect(listPayload.roles.find((role) => role.name === "admin")?.protected).toBe(true);

    const updateResponse = await updateRoleRoute(
      new Request(`http://localhost/api/roles/${createdPayload.role.id}`, {
        method: "PUT",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "finance-committee",
          label: "Finance Committee",
        }),
      }),
      { params: Promise.resolve({ id: createdPayload.role.id }) },
    );

    expect(updateResponse.status).toBe(200);

    const updated = await db.role.findUniqueOrThrow({
      where: { id: createdPayload.role.id },
    });
    expect(updated).toMatchObject({
      name: "finance-committee",
      label: "Finance Committee",
    });

    const deleteResponse = await deleteRoleRoute(
      new Request(`http://localhost/api/roles/${createdPayload.role.id}`, {
        method: "DELETE",
        headers: createMutationRequestHeaders(),
      }),
      { params: Promise.resolve({ id: createdPayload.role.id }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(await db.role.findUnique({ where: { id: createdPayload.role.id } })).toBeNull();

    const auditEvents = await db.auditLog.findMany({
      where: {
        action: {
          in: ["role.created", "role.updated", "role.deleted"],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    expect(auditEvents.map((event) => event.action)).toEqual([
      "role.created",
      "role.updated",
      "role.deleted",
    ]);
  });

  test("built-in roles cannot be renamed or deleted", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const builtInRole = await db.role.findUniqueOrThrow({
      where: { name: "approver" },
    });

    const renameResponse = await updateRoleRoute(
      new Request(`http://localhost/api/roles/${builtInRole.id}`, {
        method: "PUT",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "procurement-panel",
        }),
      }),
      { params: Promise.resolve({ id: builtInRole.id }) },
    );

    expect(renameResponse.status).toBe(403);

    const deleteResponse = await deleteRoleRoute(
      new Request(`http://localhost/api/roles/${builtInRole.id}`, {
        method: "DELETE",
        headers: createMutationRequestHeaders(),
      }),
      { params: Promise.resolve({ id: builtInRole.id }) },
    );

    expect(deleteResponse.status).toBe(403);
  });

  test("role creation enforces lowercase slug validation", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const response = await createRoleRoute(
      new Request("http://localhost/api/roles", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: "Review Board",
          label: "Review Board",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  test("roles assigned to users cannot be deleted", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const role = await db.role.create({
      data: {
        name: "review-board",
        label: "Review Board",
      },
    });

    await db.user.create({
      data: {
        email: "reviewer@example.com",
        name: "Reviewer",
        roles: {
          connect: [{ name: "review-board" }],
        },
      },
    });

    const response = await deleteRoleRoute(
      new Request(`http://localhost/api/roles/${role.id}`, {
        method: "DELETE",
        headers: createMutationRequestHeaders(),
      }),
      { params: Promise.resolve({ id: role.id }) },
    );

    expect(response.status).toBe(409);
  });

  test("roles referenced by form field access rules cannot be deleted", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const role = await db.role.create({
      data: {
        name: "finance-committee",
        label: "Finance Committee",
      },
    });

    await createFormFixture({
      createdById: admin.id,
      schema: {
        display: "form",
        components: [
          {
            type: "textfield",
            key: "amount",
            label: "Amount",
            input: true,
            properties: {
              readRoles: "finance-committee,admin",
            },
          },
          {
            type: "button",
            action: "submit",
            label: "Submit",
          },
        ],
      },
    });

    const response = await deleteRoleRoute(
      new Request(`http://localhost/api/roles/${role.id}`, {
        method: "DELETE",
        headers: createMutationRequestHeaders(),
      }),
      { params: Promise.resolve({ id: role.id }) },
    );

    expect(response.status).toBe(409);
  });

  test("roles referenced by workflow definitions cannot be deleted", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const role = await db.role.create({
      data: {
        name: "procurement-panel",
        label: "Procurement Panel",
      },
    });

    await db.workflow.create({
      data: {
        name: "Procurement Workflow",
        createdById: admin.id,
        definition: [
          {
            id: "approval-stage",
            name: "Procurement Review",
            type: "approval",
            assignTo: {
              type: "role",
              value: "procurement-panel",
            },
            onApprove: "close",
            onReject: "close",
          },
        ] as Prisma.InputJsonValue,
      },
    });

    const response = await deleteRoleRoute(
      new Request(`http://localhost/api/roles/${role.id}`, {
        method: "DELETE",
        headers: createMutationRequestHeaders(),
      }),
      { params: Promise.resolve({ id: role.id }) },
    );

    expect(response.status).toBe(409);
  });

  test("roles used by pending pooled approval tasks cannot be deleted", async () => {
    const { admin, submitter } = await seedBaseUsers();
    setMockSession(admin);

    const role = await db.role.create({
      data: {
        name: "review-board",
        label: "Review Board",
      },
    });

    const reviewer = await db.user.create({
      data: {
        email: "board-member@example.com",
        name: "Board Member",
        roles: {
          connect: [{ name: "review-board" }],
        },
      },
    });

    const form = await createFormFixture({
      createdById: admin.id,
    });

    const submission = await db.submission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        submittedById: submitter.id,
        data: {},
        status: "in_review",
        workflowDefinition: [
          {
            id: "board-review",
            name: "Board Review",
            type: "approval",
            assignTo: {
              type: "role",
              value: "review-board",
            },
            onApprove: "close",
            onReject: "close",
          },
        ] as Prisma.InputJsonValue,
      },
    });

    await db.approvalTask.create({
      data: {
        submissionId: submission.id,
        assignedToId: reviewer.id,
        stageIndex: 0,
        status: "pending",
      },
    });

    const response = await deleteRoleRoute(
      new Request(`http://localhost/api/roles/${role.id}`, {
        method: "DELETE",
        headers: createMutationRequestHeaders(),
      }),
      { params: Promise.resolve({ id: role.id }) },
    );

    expect(response.status).toBe(409);
  });
});
