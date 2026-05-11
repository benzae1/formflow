import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../../src/lib/db";
import { encryptSensitiveSubmissionData } from "../../src/lib/submission-encryption";
import type { FormioSchema } from "../../src/lib/formio-sensitive-fields";
import { waitFor } from "./polling";

const baseSchema: FormioSchema = {
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

const sensitiveSchema: FormioSchema = {
  display: "form",
  components: [
    {
      type: "textfield",
      key: "publicNote",
      label: "Public note",
      input: true,
    },
    {
      type: "number",
      key: "salary",
      label: "Salary",
      input: true,
      properties: {
        sensitive: "true",
        readRoles: "admin,compliance",
        ownerCanRead: "false",
      },
    },
    {
      type: "button",
      action: "submit",
      label: "Submit",
      theme: "primary",
    },
  ],
};

export async function resetDatabase() {
  await db.notification.deleteMany();
  await db.approvalTask.deleteMany();
  await db.submission.deleteMany();
  await db.formVersion.deleteMany();
  await db.form.deleteMany();
  await db.workflow.deleteMany();
  await db.delegation.deleteMany();
  await db.orgMembership.deleteMany();
  await db.orgUnit.deleteMany();
  await db.user.deleteMany();
}

export async function seedBaseUsers() {
  const admin = await db.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      roles: ["admin", "submitter"],
    },
  });

  const approver = await db.user.create({
    data: {
      email: "approver@example.com",
      name: "Approver User",
      roles: ["approver", "submitter"],
    },
  });

  const submitter = await db.user.create({
    data: {
      email: "submitter@example.com",
      name: "Submitter User",
      roles: ["submitter"],
    },
  });

  const compliance = await db.user.create({
    data: {
      email: "compliance@example.com",
      name: "Compliance User",
      roles: ["compliance"],
    },
  });

  return { admin, approver, submitter, compliance };
}

export function uniqueSlug(prefix = "form") {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function uniqueName(prefix = "Form") {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

export async function createWorkflowFixture(input: {
  createdById: string;
  approverId: string;
  name?: string;
}) {
  return db.workflow.create({
    data: {
      name: input.name ?? uniqueName("Workflow"),
      createdById: input.createdById,
      definition: [
        {
          id: "approval-stage",
          name: "Approval",
          type: "approval",
          assignTo: {
            type: "user",
            value: input.approverId,
          },
          onApprove: "close",
          onReject: "close",
        },
      ] as Prisma.InputJsonValue,
    },
  });
}

export async function createFormFixture(input: {
  createdById: string;
  workflowId?: string | null;
  slug?: string;
  title?: string;
  status?: "draft" | "published" | "archived";
  sensitivity?: "standard" | "pii" | "sensitive";
  schema?: FormioSchema;
}) {
  const schema = input.schema ?? baseSchema;

  const form = await db.form.create({
    data: {
      slug: input.slug ?? uniqueSlug("request"),
      title: input.title ?? uniqueName("Request"),
      schema: schema as Prisma.InputJsonValue,
      status: input.status ?? "draft",
      sensitivity: input.sensitivity ?? "standard",
      workflowId: input.workflowId ?? null,
      createdById: input.createdById,
    },
  });

  await db.formVersion.create({
    data: {
      formId: form.id,
      version: form.version,
      schema: form.schema as Prisma.InputJsonValue,
    },
  });

  return form;
}

export async function createSensitiveFormFixture(input: {
  createdById: string;
  workflowId?: string | null;
  status?: "draft" | "published" | "archived";
  slug?: string;
  title?: string;
}) {
  return createFormFixture({
    ...input,
    sensitivity: "sensitive",
    schema: sensitiveSchema,
  });
}

export async function createSubmissionFixture(input: {
  formId: string;
  formVersion: number;
  submittedById: string;
  data?: Record<string, unknown>;
  status?: "draft" | "submitted" | "in_review" | "needs_revision" | "approved" | "rejected" | "closed";
  workflowRunId?: string | null;
  schema?: FormioSchema;
}) {
  const rawData = input.data ?? { requestTitle: "Test request" };
  const data = input.schema
    ? encryptSensitiveSubmissionData(input.schema, rawData)
    : rawData;

  return db.submission.create({
    data: {
      formId: input.formId,
      formVersion: input.formVersion,
      submittedById: input.submittedById,
      data: data as Prisma.InputJsonValue,
      status: input.status ?? "draft",
      workflowRunId: input.workflowRunId ?? null,
    },
  });
}

export async function createApprovalTaskFixture(input: {
  submissionId: string;
  assignedToId: string;
  stageIndex?: number;
  status?: "pending" | "approved" | "rejected" | "revision_requested" | "cancelled";
  dueAt?: Date | null;
  note?: string;
}) {
  return db.approvalTask.create({
    data: {
      submissionId: input.submissionId,
      assignedToId: input.assignedToId,
      stageIndex: input.stageIndex ?? 0,
      status: input.status ?? "pending",
      dueAt: input.dueAt ?? null,
      note: input.note,
    },
  });
}

export async function waitForApprovalTask(submissionId: string) {
  return waitFor(
    () =>
      db.approvalTask.findFirst({
        where: {
          submissionId,
          status: "pending",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    { label: `approval task for ${submissionId}` },
  );
}

export async function waitForSubmissionStatus(
  submissionId: string,
  expectedStatus:
    | "draft"
    | "submitted"
    | "in_review"
    | "needs_revision"
    | "approved"
    | "rejected"
    | "closed",
) {
  return waitFor(
    async () => {
      const submission = await db.submission.findUnique({
        where: { id: submissionId },
      });

      return submission?.status === expectedStatus ? submission : null;
    },
    { label: `submission ${submissionId} status ${expectedStatus}` },
  );
}
