import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { getRequestLocale } from "@/lib/request-locale";
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
  const locale = getRequestLocale(req);
  const isGerman = locale === "de";

  try {
    assertMutationRequest(req);
    const user = await requireRole(["admin"]);
    const body = await req.json();
    const input = createFormSchema.parse(body);

    if (input.workflowId) {
      const workflow = await db.workflow.findUnique({
        where: { id: input.workflowId },
        select: { id: true },
      });

      if (!workflow) {
        throw new ApiError(
          "WORKFLOW_NOT_FOUND",
          isGerman
            ? "Bitte einen gültigen Workflow wählen oder das Feld leer lassen."
            : "Select a valid workflow or leave the workflow blank for now.",
          404,
        );
      }
    }

    if (input.parentFormId) {
      const parentForm = await db.form.findUnique({
        where: { id: input.parentFormId },
        select: { id: true },
      });

      if (!parentForm) {
        throw new ApiError(
          "PARENT_FORM_NOT_FOUND",
          isGerman
            ? "Bitte ein gültiges Elternformular wählen oder die Auswahl leeren."
            : "Select a valid parent form or clear the parent form selection.",
          404,
        );
      }
    }

    if (input.workflowId) {
      await assertWorkflowRunnable(input.workflowId);
    }

    const form = await db.form.create({
      data: {
        slug: input.slug,
        title: input.title,
        schema: input.schema as Prisma.InputJsonValue,
        translations: (input.translations ?? Prisma.JsonNull) as Prisma.InputJsonValue,
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
        schema: form.schema as Prisma.InputJsonValue,
        translations: (form.translations ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "form.created",
      resourceType: "form",
      resourceId: form.id,
      afterState: form,
    });

    return Response.json({ form }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const message = firstIssue
        ? `${firstIssue.path.join(".") || "form"}: ${firstIssue.message}`
        : isGerman
          ? "Die Formulardaten sind ungültig."
          : "The form details are invalid.";

      return apiErrorResponse(new ApiError("INVALID_FORM_INPUT", message, 400));
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return apiErrorResponse(
          new ApiError(
            "FORM_SLUG_TAKEN",
            isGerman
              ? "Dieser Slug wird bereits verwendet. Bitte einen anderen wählen."
              : "That slug is already in use. Choose a different slug.",
            409,
          ),
        );
      }

      if (error.code === "P2003") {
        return apiErrorResponse(
          new ApiError(
            "FORM_RELATION_INVALID",
            isGerman
              ? "Der ausgewählte Workflow oder das Elternformular konnte nicht verknüpft werden."
              : "The selected workflow or parent form could not be linked.",
            400,
          ),
        );
      }
    }

    return apiErrorResponse(error);
  }
}

async function assertWorkflowRunnable(workflowId: string) {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, definition: true },
  });

  if (!workflow) {
    throw new ApiError(
      "WORKFLOW_NOT_FOUND",
      "Select a valid workflow or leave the workflow blank for now.",
      404,
    );
  }

  if (!Array.isArray(workflow.definition) || workflow.definition.length === 0) {
    throw new ApiError(
      "WORKFLOW_INVALID",
      "Attach a workflow with at least one executable stage.",
      409,
    );
  }
}
