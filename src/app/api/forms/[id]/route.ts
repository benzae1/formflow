import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { updateFormSchema } from "@/lib/validation/forms";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);

    const { id } = await context.params;

    const form = await db.form.findUnique({
      where: { id },
      include: {
        workflow: true,
        versions: true,
      },
    });

    if (!form) {
      throw new ApiError("FORM_NOT_FOUND", "Form not found.", 404);
    }

    return Response.json({ form });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["admin"]);

    const { id } = await context.params;
    const body = await req.json();
    const input = updateFormSchema.parse(body);

    const existing = await db.form.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError("FORM_NOT_FOUND", "Form not found.", 404);
    }

    const shouldBumpVersion =
      existing.status === "published" &&
      input.schema &&
      JSON.stringify(input.schema) !== JSON.stringify(existing.schema);

    const nextVersion = shouldBumpVersion
      ? existing.version + 1
      : existing.version;

    const updateData: Prisma.FormUncheckedUpdateInput = {
      version: nextVersion,
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.schema !== undefined
        ? { schema: input.schema as Prisma.InputJsonValue }
        : {}),
      ...(input.sensitivity !== undefined
        ? { sensitivity: input.sensitivity }
        : {}),
      ...(input.workflowId !== undefined ? { workflowId: input.workflowId } : {}),
      ...(input.parentFormId !== undefined
        ? { parentFormId: input.parentFormId }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    const form = await db.form.update({
      where: { id },
      data: updateData,
    });

    if (shouldBumpVersion) {
      await db.formVersion.create({
        data: {
          formId: form.id,
          version: form.version,
          schema: form.schema as Prisma.InputJsonValue,
        },
      });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "form.updated",
      resourceType: "form",
      resourceId: form.id,
      beforeState: existing,
      afterState: form,
    });

    if (existing.status !== "published" && form.status === "published") {
      await writeAuditLog({
        actorId: user.id,
        action: "form.published",
        resourceType: "form",
        resourceId: form.id,
        beforeState: existing,
        afterState: form,
      });
    }

    return Response.json({ form });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
