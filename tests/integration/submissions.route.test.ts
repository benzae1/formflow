import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RoutingTarget, WorkflowDefinition } from "../../src/domain/workflow";
import { db } from "../../src/lib/db";
import {
  createApprovalTaskFixture,
  createFormFixture,
  createSensitiveFormFixture,
  createSubmissionFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  waitForApprovalTask,
  waitForSubmissionStatus,
} from "../support/fixtures";
import { createMutationRequestHeaders } from "../support/mutation";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";
import { buildSensitiveAccessCookie, getSensitiveAccessScope } from "../../src/lib/sensitive-access";

const startWorkflowMock = vi.fn();

type WorkflowStartInput = {
  submissionId: string;
  workflowDefinition: WorkflowDefinition;
};

type WorkflowStartOptions = {
  args: [WorkflowStartInput];
};

function isDirectUserTarget(
  target: RoutingTarget | RoutingTarget[] | undefined,
): target is Extract<RoutingTarget, { type: "user" }> {
  return !Array.isArray(target) && target?.type === "user";
}

vi.mock("@/lib/temporal", () => ({
  getTemporalClient: async () => ({
    workflow: {
      start: startWorkflowMock,
    },
  }),
}));

import { GET, POST } from "../../src/app/api/submissions/route";

describe("submissions route", () => {
  beforeEach(async () => {
    await resetDatabase();
    startWorkflowMock.mockReset();
    startWorkflowMock.mockImplementation(
      async (_workflow: unknown, options: WorkflowStartOptions) => {
        const input = options.args[0];
        const firstApprovalStage = input.workflowDefinition.find(
          (stage) => stage.type === "approval" && isDirectUserTarget(stage.assignTo),
        );

        setTimeout(async () => {
          await db.submission.update({
            where: { id: input.submissionId },
            data: { status: "in_review" },
          });

          if (!firstApprovalStage || !isDirectUserTarget(firstApprovalStage.assignTo)) {
            return;
          }

          await db.approvalTask.create({
            data: {
              submissionId: input.submissionId,
              stageIndex: 0,
              assignedToId: firstApprovalStage.assignTo.value,
            },
          });
        }, 0);
      },
    );
  });

  test("published forms create submitted submissions, start workflows, and assign approvers", async () => {
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

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Laptop access",
          },
          saveAsDraft: false,
        }),
      }),
    );

    expect(response.status).toBe(201);

    const payload = await parseJson<{ submission: { id: string; status: string } }>(response);
    expect(payload.submission.status).toBe("submitted");

    await waitForSubmissionStatus(payload.submission.id, "in_review");
    const task = await waitForApprovalTask(payload.submission.id);
    const storedSubmission = await db.submission.findUnique({
      where: { id: payload.submission.id },
    });

    expect(storedSubmission?.workflowRunId).toBe(payload.submission.id);
    expect(task?.assignedToId).toBe(approver.id);
  }, 45_000);

  test("draft submissions can be saved without a workflow", async () => {
    const { admin, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: null,
      status: "published",
    });

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Draft request",
          },
          saveAsDraft: true,
        }),
      }),
    );

    expect(response.status).toBe(201);

    const payload = await parseJson<{ submission: { id: string; status: string } }>(response);
    const storedSubmission = await db.submission.findUnique({
      where: { id: payload.submission.id },
    });

    expect(payload.submission.status).toBe("draft");
    expect(storedSubmission?.workflowRunId).toBeNull();
  });

  test("restricted published forms are unavailable to users without a matching role", async () => {
    const { admin, approver, submitter } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const restrictedForm = await createFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
      allowedRoleNames: ["approver"],
    });

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: restrictedForm.id,
          data: {
            requestTitle: "Should be blocked",
          },
          saveAsDraft: false,
        }),
      }),
    );

    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("FORM_NOT_AVAILABLE");
  });

  test("submitted forms without a workflow are rejected", async () => {
    const { admin, submitter } = await seedBaseUsers();
    const form = await createFormFixture({
      createdById: admin.id,
      workflowId: null,
      status: "published",
    });

    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Blocked request",
          },
          saveAsDraft: false,
        }),
      }),
    );

    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("FORM_HAS_NO_WORKFLOW");
  });

  test("failed workflow starts do not leave orphaned submitted drafts behind", async () => {
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

    startWorkflowMock.mockRejectedValueOnce(new Error("Temporal unavailable"));
    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Broken workflow start",
          },
          saveAsDraft: false,
        }),
      }),
    );

    expect(response.status).toBe(503);
    const payload = await parseJson<{ error: { code: string } }>(response);
    expect(payload.error.code).toBe("WORKFLOW_UNAVAILABLE");
    expect(await db.submission.count()).toBe(0);
  });

  test("already-started workflows can still mark the submission as submitted", async () => {
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

    startWorkflowMock.mockRejectedValueOnce(
      Object.assign(new Error("Workflow execution already started"), {
        name: "WorkflowExecutionAlreadyStartedError",
      }),
    );
    setMockSession(submitter);

    const response = await POST(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        headers: createMutationRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          formId: form.id,
          data: {
            requestTitle: "Retry-safe workflow start",
          },
          saveAsDraft: false,
        }),
      }),
    );

    expect(response.status).toBe(201);

    const payload = await parseJson<{ submission: { id: string; status: string } }>(response);
    const storedSubmission = await db.submission.findUnique({
      where: { id: payload.submission.id },
    });

    expect(payload.submission.status).toBe("submitted");
    expect(storedSubmission?.workflowRunId).toBe(payload.submission.id);
  });

  test("visibility and field access are role-aware", async () => {
    const { admin, approver, submitter, compliance } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const sensitiveForm = await createSensitiveFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    const ownSubmission = await createSubmissionFixture({
      formId: sensitiveForm.id,
      formVersion: sensitiveForm.version,
      submittedById: submitter.id,
      status: "submitted",
      schema: sensitiveForm.schema as never,
      data: {
        publicNote: "Visible to everyone",
        salary: 150000,
      },
    });

    await createApprovalTaskFixture({
      submissionId: ownSubmission.id,
      assignedToId: approver.id,
    });

    const unrelatedSubmission = await createSubmissionFixture({
      formId: sensitiveForm.id,
      formVersion: sensitiveForm.version,
      submittedById: admin.id,
      status: "submitted",
      schema: sensitiveForm.schema as never,
      data: {
        publicNote: "Admin only",
        salary: 200000,
      },
    });

    setMockSession(submitter);
    const submitterPayload = await parseJson<{
      submissions: Array<{ id: string; data: { publicNote: string; salary: number | null } }>;
    }>(await GET(new Request("http://localhost/api/submissions")));

    expect(submitterPayload.submissions).toHaveLength(1);
    expect(submitterPayload.submissions[0]?.id).toBe(ownSubmission.id);
    expect(submitterPayload.submissions[0]?.data.publicNote).toBe("Visible to everyone");
    expect(submitterPayload.submissions[0]?.data.salary).toBeNull();

    setMockSession(approver);
    const approverPayload = await parseJson<{
      submissions: Array<{ id: string; data: { salary: number | null } }>;
    }>(await GET(new Request("http://localhost/api/submissions")));

    expect(approverPayload.submissions.map((item) => item.id)).toContain(ownSubmission.id);
    expect(approverPayload.submissions.map((item) => item.id)).not.toContain(unrelatedSubmission.id);
    expect(
      approverPayload.submissions.find((item) => item.id === ownSubmission.id)?.data.salary,
    ).toBeNull();

    setMockSession(compliance);
    const sensitiveCookie = buildSensitiveAccessCookie({
      actorId: compliance.id,
      scope: getSensitiveAccessScope({ kind: "admin-submissions" }),
      reason: "Compliance case review 2026-001",
    }).split(";", 1)[0];
    const compliancePayload = await parseJson<{
      submissions: Array<{ id: string; data: { salary: number | null } }>;
    }>(
      await GET(
        new Request("http://localhost/api/submissions?includeSensitive=true", {
          headers: {
            cookie: sensitiveCookie,
          },
        }),
      ),
    );

    expect(compliancePayload.submissions.map((item) => item.id)).toEqual(
      expect.arrayContaining([ownSubmission.id, unrelatedSubmission.id]),
    );
    expect(
      compliancePayload.submissions.find((item) => item.id === ownSubmission.id)?.data.salary,
    ).toBe(150000);
  });

  test("sensitive admin list requests require a signed grant", async () => {
    const { admin, approver, submitter, compliance } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const sensitiveForm = await createSensitiveFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
    });

    await createSubmissionFixture({
      formId: sensitiveForm.id,
      formVersion: sensitiveForm.version,
      submittedById: submitter.id,
      status: "submitted",
      schema: sensitiveForm.schema as never,
      data: {
        publicNote: "Restricted",
        salary: 90000,
      },
    });

    setMockSession(compliance);

    const response = await GET(new Request("http://localhost/api/submissions?includeSensitive=true"));
    const payload = await parseJson<{
      error: { code: string; message: string; status: number };
    }>(response);

    expect(response.status).toBe(428);
    expect(payload.error.code).toBe("BREAK_GLASS_REQUIRED");
  });

  test("compliance list excludes pii and sensitive submissions by default", async () => {
    const { admin, approver, submitter, compliance } = await seedBaseUsers();
    const workflow = await createWorkflowFixture({
      createdById: admin.id,
      approverId: approver.id,
    });
    const standardForm = await createFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
      sensitivity: "standard",
    });
    const piiForm = await createFormFixture({
      createdById: admin.id,
      workflowId: workflow.id,
      status: "published",
      sensitivity: "pii",
    });

    await createSubmissionFixture({
      formId: standardForm.id,
      formVersion: standardForm.version,
      submittedById: submitter.id,
      status: "submitted",
    });
    await createSubmissionFixture({
      formId: piiForm.id,
      formVersion: piiForm.version,
      submittedById: submitter.id,
      status: "submitted",
    });

    setMockSession(compliance);

    const payload = await parseJson<{
      submissions: Array<{ form: { id: string } }>;
    }>(await GET(new Request("http://localhost/api/submissions")));

    expect(payload.submissions).toHaveLength(1);
    expect(payload.submissions[0]?.form.id).toBe(standardForm.id);
  });
});
