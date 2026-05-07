import { db } from "@/lib/db";
import { apiErrorResponse, ApiError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import type { FormioSchema } from "@/lib/formio-sensitive-fields";
import { encryptSensitiveSubmissionData } from "@/lib/submission-encryption";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";
import { getTemporalClient } from "@/lib/temporal";
import { updateSubmissionSchema } from "@/lib/validation/submissions";

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
      where: {
        id,
        ...submissionVisibilityWhere(user),
      },
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

    const updated = await db.submission.update({
      where: { id },
      data: {
        data: encryptedData,
        status:
          submission.status === "needs_revision"
            ? "in_review"
            : submission.status,
      },
    });

    if (submission.status === "needs_revision") {
      const temporal = await getTemporalClient();
      const handle = temporal.workflow.getHandle(id);
      await handle.signal("resubmitted");
    }

    return Response.json({ submission: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
