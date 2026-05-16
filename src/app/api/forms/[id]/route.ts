import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { getRequestLocale } from "@/lib/request-locale";
import { updateFormSchema } from "@/lib/validation/forms";
import { assertWorkflowRunnable } from "@/lib/validation/workflow-server";

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
  const locale = getRequestLocale(req);
  const isGerman = locale === "de";

  try {
    assertMutationRequest(req);
    const user = await requireRole(["admin"]);

    const { id } = await context.params;
    const body = await req.json();
    const input = updateFormSchema.parse(body);

    const existing = await db.form.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError("FORM_NOT_FOUND", isGerman ? "Formular nicht gefunden." : "Form not found.", 404);
    }

    if (input.workflowId) {
      await assertWorkflowRunnable(input.workflowId);
    }

    if (input.parentFormId) {
      const parentForm = await db.form.findUnique({
        where: { id: input.parentFormId },
        select: { id: true },
      });

      if (!parentForm) {
        throw new ApiError("PARENT_FORM_NOT_FOUND", isGerman ? "Elternformular nicht gefunden." : "Parent form not found.", 404);
      }
    }

    const shouldBumpVersion =
      existing.status === "published" &&
      (
        (input.schema !== undefined &&
          JSON.stringify(input.schema) !== JSON.stringify(existing.schema)) ||
        (input.title !== undefined && input.title !== existing.title) ||
        (input.translations !== undefined &&
          JSON.stringify(input.translations) !== JSON.stringify(existing.translations))
      );

    const nextVersion = shouldBumpVersion
      ? existing.version + 1
      : existing.version;
    const nextStatus = input.status ?? existing.status;
    const nextWorkflowId =
      input.workflowId !== undefined ? input.workflowId : existing.workflowId;

    if (nextStatus === "published" && !nextWorkflowId) {
      throw new ApiError(
        "FORM_HAS_NO_WORKFLOW",
        isGerman
          ? "Veröffentlichte Formulare müssen einen ausführbaren Workflow haben."
          : "Published forms must have a runnable workflow attached.",
        409,
      );
    }

    const updateData: Prisma.FormUncheckedUpdateInput = {
      version: nextVersion,
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.schema !== undefined
        ? { schema: input.schema as Prisma.InputJsonValue }
        : {}),
      ...(input.translations !== undefined
        ? { translations: (input.translations ?? Prisma.JsonNull) as Prisma.InputJsonValue }
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
          translations: (form.translations ?? Prisma.JsonNull) as Prisma.InputJsonValue,
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
