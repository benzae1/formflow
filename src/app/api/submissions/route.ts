import { db } from "@/lib/db";
import { apiErrorResponse, ApiError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { createSubmissionSchema } from "@/lib/validation/submissions";

export async function GET() {
  return Response.json({ submissions: [] });
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = createSubmissionSchema.parse(body);

    const form = await db.form.findUnique({
      where: { id: input.formId },
    });

    if (!form || form.status !== "published") {
      throw new ApiError("FORM_NOT_AVAILABLE", "Form not available.", 404);
    }

    const submission = await db.submission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        submittedById: user.id,
        data: input.data,
        status: input.saveAsDraft ? "draft" : "submitted",
        parentSubmissionId: input.parentSubmissionId ?? null,
      },
    });

    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
