import { db } from "@/lib/db";
import { apiErrorResponse, ApiError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { filterSubmissionDataForUser } from "@/lib/field-access";
import { requireUser } from "@/lib/permissions";
import { encryptSensitiveSubmissionData } from "@/lib/submission-encryption";
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
      submissions.flatMap((submission) => {
        const logs = [
          writeAuditLog({
            actorId: user.id,
            action: "submission.viewed",
            resourceType: "submission",
            resourceId: submission.id,
            metadata: {
              reason: "submission.viewed",
            },
          }),
        ];

        if (submission.form.sensitivity === "sensitive") {
          logs.push(
            writeAuditLog({
              actorId: user.id,
              action: "sensitive.accessed",
              resourceType: "submission",
              resourceId: submission.id,
              metadata: {
                reason: "submission.viewed",
              },
            }),
          );
        }

        return logs;
      }),
    );

    const visibleSubmissions = submissions.map((submission) => ({
      ...submission,
      data: filterSubmissionDataForUser({
        schema: submission.form.schema as Record<string, unknown>,
        data: submission.data as Record<string, unknown>,
        userRoles: user.roles,
        isOwner: submission.submittedById === user.id,
      }),
    }));

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

    const submission = await db.submission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        submittedById: user.id,
        data,
        status: input.saveAsDraft ? "draft" : "submitted",
        parentSubmissionId: input.parentSubmissionId ?? null,
      },
    });

    if (!input.saveAsDraft) {
      if (!form.workflowId) {
        throw new ApiError(
          "FORM_HAS_NO_WORKFLOW",
          "This form has no workflow attached.",
          409,
        );
      }

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

      await db.submission.update({
        where: { id: submission.id },
        data: {
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
          ...submission,
          data: filterSubmissionDataForUser({
            schema: form.schema as Record<string, unknown>,
            data: submission.data as Record<string, unknown>,
            userRoles: user.roles,
            isOwner: true,
          }),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
