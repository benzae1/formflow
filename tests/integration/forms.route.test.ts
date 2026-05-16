import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { POST } from "../../src/app/api/forms/route";
import {
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  uniqueSlug,
} from "../support/fixtures";
import { createMutationRequestHeaders } from "../support/mutation";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

describe("forms route", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const validSchema = {
    display: "form",
    components: [
      {
        type: "textfield",
        key: "requestTitle",
        label: "Request title",
        input: true,
      },
      {
        type: "button",
        action: "submit",
        label: "Submit",
        theme: "primary",
      },
    ],
  };
  const emailRequestSchema = JSON.parse(
    readFileSync(new URL("../../forms/emailantrag.json", import.meta.url), "utf8"),
  ) as Record<string, unknown>;

  test("admin can create a form and initial version", async () => {
    const { admin, approver } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
      name: "Primary approval",
    });

    setMockSession(admin);

    const response = await POST(
      new Request("http://localhost/api/forms", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          slug: uniqueSlug("access-request"),
          title: "Access request",
          sensitivity: "standard",
          workflowId: workflow.id,
          parentFormId: null,
          schema: validSchema,
        }),
      }),
    );

    expect(response.status).toBe(201);

    const payload = await parseJson<{ form: { id: string; workflowId: string } }>(response);
    const version = await db.formVersion.findFirst({
      where: { formId: payload.form.id, version: 1 },
    });
    const auditLog = await db.auditLog.findFirst({
      where: {
        resourceType: "form",
        resourceId: payload.form.id,
        action: "form.created",
      },
    });

    expect(payload.form.workflowId).toBe(workflow.id);
    expect(version).not.toBeNull();
    expect(auditLog?.actorId).toBe(admin.id);
  });

  test("duplicate slugs are rejected with a clear error", async () => {
    const { admin, approver } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });

    setMockSession(admin);

    const slug = uniqueSlug("duplicate");
    const request = () =>
      POST(
        new Request("http://localhost/api/forms", {
          method: "POST",
          headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            slug,
            title: "Duplicate slug form",
            sensitivity: "standard",
            workflowId: workflow.id,
            schema: validSchema,
          }),
        }),
      );

    expect((await request()).status).toBe(201);

    const duplicate = await request();
    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(duplicate);

    expect(duplicate.status).toBe(409);
    expect(payload.error.code).toBe("FORM_SLUG_TAKEN");
  });

  test("non-admin users cannot create forms", async () => {
    const { submitter } = await seedBaseUsers();
    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/forms", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          slug: uniqueSlug("blocked"),
          title: "Blocked form",
          sensitivity: "standard",
          schema: validSchema,
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  test("dangerous executable schema settings are rejected", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const response = await POST(
      new Request("http://localhost/api/forms", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          slug: uniqueSlug("dangerous"),
          title: "Dangerous schema",
          sensitivity: "standard",
          schema: {
            ...validSchema,
            components: [
              {
                ...validSchema.components[0],
                calculateValue: "value = data.secret",
              },
              validSchema.components[1],
            ],
          },
        }),
      }),
    );

    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_FORM_INPUT");
    expect(payload.error.message).toContain("unsupported executable setting");
  });

  test("real exported forms remain compatible with schema hardening", async () => {
    const { admin } = await seedBaseUsers();
    setMockSession(admin);

    const response = await POST(
      new Request("http://localhost/api/forms", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          slug: uniqueSlug("emailantrag"),
          title: "Email request",
          sensitivity: "standard",
          schema: emailRequestSchema,
        }),
      }),
    );

    const payload = await parseJson<{ form: { id: string; schema: Record<string, unknown> } }>(
      response,
    );

    expect(response.status).toBe(201);
    expect(payload.form.schema.display).toBe("form");
  });
});
