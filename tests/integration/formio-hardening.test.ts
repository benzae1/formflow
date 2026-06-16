import { beforeEach, describe, expect, test } from "vitest";
import { POST } from "../../src/app/api/submissions/route";
import {
  decryptSubmissionData,
  encryptSensitiveSubmissionData,
  filterSubmissionDataForUser,
  normalizeSubmissionData,
} from "../../src/lib/formio-data";
import type { FormioSchema } from "../../src/lib/formio-schema";
import { getSubmissionWorkflowContext } from "../../src/temporal/activities/approvalActivities";
import {
  createFormFixture,
  createSubmissionFixture,
  resetDatabase,
  seedBaseUsers,
} from "../support/fixtures";
import { createMutationRequestHeaders } from "../support/mutation";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

const nestedSensitiveSchema: FormioSchema = {
  display: "form",
  components: [
    {
      type: "container",
      key: "employee",
      label: "Employee",
      components: [
        {
          type: "textfield",
          key: "name",
          label: "Name",
          input: true,
        },
        {
          type: "columns",
          columns: [
            {
              components: [
                {
                  type: "number",
                  key: "salary",
                  label: "Salary",
                  input: true,
                  properties: {
                    sensitive: "true",
                    readRoles: "compliance",
                    ownerCanRead: "false",
                  },
                },
              ],
            },
            {
              components: [
                {
                  type: "day",
                  key: "startDate",
                  label: "Start date",
                  input: true,
                },
              ],
            },
          ],
        },
        {
          type: "editgrid",
          key: "dependents",
          label: "Dependents",
          input: true,
          components: [
            {
              type: "textfield",
              key: "ssn",
              label: "SSN",
              input: true,
              properties: {
                sensitive: "true",
                readRoles: "admin",
                ownerCanRead: "false",
              },
            },
            {
              type: "table",
              label: "Dependent details",
              rows: [
                [
                  {
                    components: [
                      {
                        type: "textfield",
                        key: "nickname",
                        label: "Nickname",
                        input: true,
                      },
                    ],
                  },
                ],
              ],
            },
          ],
        },
        {
          type: "datagrid",
          key: "history",
          label: "History",
          input: true,
          components: [
            {
              type: "textfield",
              key: "comment",
              label: "Comment",
              input: true,
            },
            {
              type: "number",
              key: "amount",
              label: "Amount",
              input: true,
              properties: {
                sensitive: "true",
                readRoles: "admin,compliance",
                ownerCanRead: "false",
              },
            },
          ],
        },
      ],
    },
    {
      type: "button",
      key: "submit",
      action: "submit",
      label: "Submit",
    },
  ],
};

const nestedSubmissionData = {
  employee: {
    name: "Avery",
    salary: 123456,
    startDate: {
      day: "16",
      month: "05",
      year: "2026",
    },
    dependents: [
      {
        ssn: "111-22-3333",
        nickname: "Kid One",
      },
    ],
    history: [
      {
        comment: "Initial grant",
        amount: 5000,
      },
    ],
  },
};

describe("formio hardening", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("unknown nested submission keys are rejected", async () => {
    const { admin, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      status: "published",
      schema: nestedSensitiveSchema,
    });

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: form.id,
          saveAsDraft: true,
          data: {
            employee: {
              ...nestedSubmissionData.employee,
              rogue: "unexpected",
            },
          },
        }),
      }),
    );

    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_SUBMISSION_DATA");
    expect(payload.error.message).toContain("employee.rogue");
  });

  test("nested sensitive values are encrypted, redacted, and decrypted recursively", () => {
    const encrypted = encryptSensitiveSubmissionData(
      nestedSensitiveSchema,
      nestedSubmissionData,
    );
    const decrypted = decryptSubmissionData(encrypted);
    const redacted = filterSubmissionDataForUser({
      schema: nestedSensitiveSchema,
      data: encrypted,
      userRoles: ["submitter"],
      isOwner: true,
    });
    const encryptedEmployee = encrypted.employee as {
      salary: unknown;
      dependents: Array<{ ssn: unknown }>;
      history: Array<{ amount: unknown }>;
    };

    expect(encryptedEmployee.salary).toMatchObject({ __encrypted: true });
    expect(encryptedEmployee.dependents[0]?.ssn).toMatchObject({ __encrypted: true });
    expect(encryptedEmployee.history[0]?.amount).toMatchObject({ __encrypted: true });

    expect(decrypted).toEqual(nestedSubmissionData);
    expect(redacted).toEqual({
      employee: {
        name: "Avery",
        salary: null,
        startDate: {
          day: "16",
          month: "05",
          year: "2026",
        },
        dependents: [
          {
            ssn: null,
            nickname: "Kid One",
          },
        ],
        history: [
          {
            comment: "Initial grant",
            amount: null,
          },
        ],
      },
    });
  });

  test("workflow context decrypts nested submission data", async () => {
    const { admin, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      status: "published",
      schema: nestedSensitiveSchema,
    });
    const submission = await createSubmissionFixture({
      formId: form.id,
      formVersion: form.version,
      submittedById: submitter.id,
      status: "submitted",
      schema: nestedSensitiveSchema,
      data: nestedSubmissionData,
    });

    const context = await getSubmissionWorkflowContext(submission.id);

    expect(context.data).toEqual(nestedSubmissionData);
  });

  test("submit button state is dropped instead of rejected", () => {
    const schema: FormioSchema = {
      display: "form",
      components: [
        { type: "textfield", key: "name", label: "Name", input: true },
        { type: "button", key: "submit", action: "submit", label: "Submit" },
      ],
    };

    const normalized = normalizeSubmissionData(schema, {
      name: "Avery",
      submit: true,
    });

    expect(normalized).toEqual({ name: "Avery" });
  });

  test("radio accepts string, numeric, and boolean option values", () => {
    const schema: FormioSchema = {
      display: "form",
      components: [
        { type: "radio", key: "color", label: "Color", input: true },
        { type: "radio", key: "rating", label: "Rating", input: true },
        { type: "radio", key: "agree", label: "Agree", input: true },
      ],
    };

    const normalized = normalizeSubmissionData(schema, {
      color: "red",
      rating: 5,
      agree: true,
    });

    expect(normalized).toEqual({ color: "red", rating: 5, agree: true });
  });
});
