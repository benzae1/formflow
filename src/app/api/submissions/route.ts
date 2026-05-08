import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiErrorResponse, ApiError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/permissions";
import { encryptSensitiveSubmissionData } from "@/lib/submission-encryption";
import {
  auditSubmissionAccess,
  presentSubmissionForUser,
} from "@/lib/submissions";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";
import { getTemporalClient } from "@/lib/temporal";
import { createSubmissionSchema } from "@/lib/validation/submissions";
import type { FormioSchema } from "@/lib/formio-sensitive-fields";
import { approvalWorkflow } from "@/temporal/workflows/approvalWorkflow";

export async function GET() {
  try {
    const user = await requireUser();

    const submissions = await db.submission.findMany({
      where: submissionVisibilityWhere(user),
      include: {
        form: true,
        approvalTasks: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    await Promise.all(
      submissions.map((submission) =>
        auditSubmissionAccess({
          actorId: user.id,
          submissionId: submission.id,
          sensitivity: submission.form.sensitivity,
          reason: "submission.viewed",
        }),
      ),
    );

    const visibleSubmissions = submissions.map((submission) =>
      presentSubmissionForUser(
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
    );

    return Response.json({ submissions: visibleSubmissions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = createSubmissionSchema.parse(body);

    const form = await db.form.findUnique({
      where: { id: input.formId },
      include: { workflow: true },
    });

    if (!form || form.status !== "published") {
      throw new ApiError("FORM_NOT_AVAILABLE", "Form is not available.", 404);
    }

    const data = encryptSensitiveSubmissionData(
      form.schema as unknown as FormioSchema,
      input.data,
    );

    if (!input.saveAsDraft && !form.workflowId) {
      throw new ApiError(
        "FORM_HAS_NO_WORKFLOW",
        "This form has no workflow attached.",
        409,
      );
    }

    let submission = await db.submission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        submittedById: user.id,
        data: data as Prisma.InputJsonValue,
        status: "draft",
        parentSubmissionId: input.parentSubmissionId ?? null,
      },
    });

    if (!input.saveAsDraft) {
      const temporal = await getTemporalClient();

      await temporal.workflow.start(approvalWorkflow, {
        taskQueue: "formflow-approval",
        workflowId: submission.id,
        args: [
          {
            submissionId: submission.id,
            formId: form.id,
            workflowId: form.workflowId,
            submitterId: user.id,
          },
        ],
      });

      submission = await db.submission.update({
        where: { id: submission.id },
        data: {
          status: "submitted",
          workflowRunId: submission.id,
        },
      });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "submission.created",
      resourceType: "submission",
      resourceId: submission.id,
      afterState: submission,
    });

    return Response.json(
      {
        submission: {
          ...presentSubmissionForUser(
            {
              ...submission,
              form: {
                ...form,
                schema: form.schema as Record<string, unknown>,
              },
              data: submission.data as Record<string, unknown>,
            },
            user,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
