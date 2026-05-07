import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { createFormSchema } from "@/lib/validation/forms";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const forms = await db.form.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        workflow: true,
      },
    });

    return Response.json({ forms });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["admin"]);
    const body = await req.json();
    const input = createFormSchema.parse(body);

    const form = await db.form.create({
      data: {
        slug: input.slug,
        title: input.title,
        schema: input.schema,
        sensitivity: input.sensitivity,
        workflowId: input.workflowId ?? null,
        parentFormId: input.parentFormId ?? null,
        createdById: user.id,
      },
    });

    await db.formVersion.create({
      data: {
        formId: form.id,
        version: form.version,
        schema: form.schema,
      },
    });

    return Response.json({ form }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
