import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { apiErrorResponse, ApiError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import type { FormioSchema } from "@/lib/formio-sensitive-fields";
import { encryptSensitiveSubmissionData } from "@/lib/submission-encryption";
import {
  auditSubmissionAccess,
  getVisibleSubmissionById,
  getSubmissionSchema,
  presentSubmissionForUser,
} from "@/lib/submissions";
import { getTemporalClient } from "@/lib/temporal";
import { assertMutationRequest } from "@/lib/request-guard";
import { getRequestLocale } from "@/lib/request-locale";
import { updateSubmissionSchema } from "@/lib/validation/submissions";
import {
  approvalWorkflow,
  resubmittedSignal,
} from "@/temporal/workflows/approvalWorkflow";
import { resolveFormSchema } from "@/lib/form-translations";
import { normalizeSubmissionData } from "@/lib/formio-data";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const submission = await getVisibleSubmissionById({
      submissionId: id,
      user,
    });

    if (!submission) {
      throw new ApiError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
    }

    let reason = "submission.viewed";

    if (submission.form.sensitivity === "sensitive") {
      const header = req.headers.get("x-break-glass-reason");
      if (!header || header.trim().length < 10) {
        throw new ApiError(
          "BREAK_GLASS_REQUIRED",
          "A reason for accessing this sensitive submission is required. Supply a non-empty X-Break-Glass-Reason header (minimum 10 characters).",
          428,
        );
      }
      reason = header.trim();
    }

    await auditSubmissionAccess({
      actorId: user.id,
      submissionId: submission.id,
      sensitivity: submission.form.sensitivity,
      reason,
    });

    return Response.json({
      submission: presentSubmissionForUser(
        {
          ...submission,
          form: {
            ...submission.form,
            schema: getSubmissionSchema({
              ...submission,
              form: {
                ...submission.form,
                schema: submission.form.schema as Record<string, unknown>,
              },
            }),
          },
          data: submission.data as Record<string, unknown>,
        },
        user,
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const locale = getRequestLocale(req);
    const user = await requireUser();
    const { id } = await context.params;
    const body = await req.json();
    const input = updateSubmissionSchema.parse(body);

    const submission = await db.submission.findFirst({
      where: { id },
      include: {
        form: true,
      },
    });

    if (!submission) {
      throw new ApiError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
    }

    if (submission.submittedById !== user.id) {
      throw new ApiError("FORBIDDEN", "You cannot edit this submission.", 403);
    }

    if (!["draft", "needs_revision"].includes(submission.status)) {
      throw new ApiError(
        "SUBMISSION_NOT_EDITABLE",
        "Submission cannot be edited in its current state.",
        409,
      );
    }

    const localizedSchema = resolveFormSchema(
      {
        ...submission.form,
        schema: submission.form.schema as Record<string, unknown>,
      },
      locale,
    );
    let normalizedData: Record<string, unknown>;
    try {
      normalizedData = normalizeSubmissionData(
        localizedSchema as FormioSchema,
        input.data,
      );
    } catch (error) {
      throw new ApiError(
        "INVALID_SUBMISSION_DATA",
        error instanceof Error ? error.message : "Submission data is invalid.",
        400,
      );
    }
    const encryptedData = encryptSensitiveSubmissionData(
      localizedSchema as FormioSchema,
      normalizedData,
    );

    if (submission.status === "draft" && input.submit && !submission.form.workflowId) {
      throw new ApiError(
        "FORM_HAS_NO_WORKFLOW",
        "This form has no workflow attached.",
        409,
      );
    }

    let updated = await db.submission.update({
      where: { id },
      data: {
        data: encryptedData as Prisma.InputJsonValue,
        submittedLocale: locale,
      },
    });

    if (submission.status === "draft" && input.submit) {
      const workflowId = submission.form.workflowId;
      if (!workflowId) {
        throw new ApiError(
          "FORM_HAS_NO_WORKFLOW",
          "This form has no workflow attached.",
          409,
        );
      }

      const temporal = await getTemporalClient();
      const workflow = await db.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new ApiError(
          "WORKFLOW_NOT_FOUND",
          "This form's workflow could not be found.",
          404,
        );
      }

      updated = await db.submission.update({
        where: { id },
        data: {
          data: encryptedData as Prisma.InputJsonValue,
          formVersion: submission.form.version,
          formSchemaSnapshot: localizedSchema as Prisma.InputJsonValue,
          submittedLocale: locale,
          workflowId: workflow.id,
          workflowVersion: workflow.version,
          workflowDefinition: workflow.definition as Prisma.InputJsonValue,
        },
      });

      await temporal.workflow.start(approvalWorkflow, {
        taskQueue: "formflow-approval",
        workflowId: submission.id,
        args: [
          {
            submissionId: submission.id,
            formId: submission.form.id,
            workflowId: workflow.id,
            workflowVersion: workflow.version,
            workflowDefinition: workflow.definition as Parameters<
              typeof approvalWorkflow
            >[0]["workflowDefinition"],
            submitterId: user.id,
          },
        ],
      });

      updated = await db.submission.update({
        where: { id },
        data: {
          status: "submitted",
          workflowRunId: submission.id,
        },
      });
    }

    if (submission.status === "needs_revision") {
      const temporal = await getTemporalClient();
      const handle = temporal.workflow.getHandle(id);
      await handle.signal(resubmittedSignal);

      await writeAuditLog({
        actorId: user.id,
        action: "submission.resubmitted",
        resourceType: "submission",
        resourceId: id,
        beforeState: submission,
        afterState: updated,
      });
    }

    if (submission.status === "draft" && input.submit) {
      await writeAuditLog({
        actorId: user.id,
        action: "submission.created",
        resourceType: "submission",
        resourceId: id,
        beforeState: submission,
        afterState: updated,
        metadata: {
          source: "draft_submitted",
        },
      });
    }

    return Response.json({
      submission: {
        ...presentSubmissionForUser(
          {
            ...updated,
            form: {
              ...submission.form,
              schema: getSubmissionSchema({
                ...updated,
                form: {
                  ...submission.form,
                  schema: submission.form.schema as Record<string, unknown>,
                },
              }),
            },
            data: updated.data as Record<string, unknown>,
          },
          user,
        ),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
