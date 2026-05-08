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
  presentSubmissionForUser,
} from "@/lib/submissions";
import { getTemporalClient } from "@/lib/temporal";
import { updateSubmissionSchema } from "@/lib/validation/submissions";
import {
  approvalWorkflow,
  resubmittedSignal,
} from "@/temporal/workflows/approvalWorkflow";

export async function GET(
  _req: Request,
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

    await auditSubmissionAccess({
      actorId: user.id,
      submissionId: submission.id,
      sensitivity: submission.form.sensitivity,
      reason: "submission.viewed",
    });

    return Response.json({
      submission: presentSubmissionForUser(
        {
          ...submission,
          form: {
            ...submission.form,
            schema: submission.form.schema as Record<string, unknown>,
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

    const encryptedData = encryptSensitiveSubmissionData(
      submission.form.schema as unknown as FormioSchema,
      input.data,
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
      },
    });

    if (submission.status === "draft" && input.submit) {
      const temporal = await getTemporalClient();

      await temporal.workflow.start(approvalWorkflow, {
        taskQueue: "formflow-approval",
        workflowId: submission.id,
        args: [
          {
            submissionId: submission.id,
            formId: submission.form.id,
            workflowId: submission.form.workflowId,
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
              schema: submission.form.schema as Record<string, unknown>,
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
