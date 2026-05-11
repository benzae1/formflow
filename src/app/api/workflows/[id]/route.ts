import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { createWorkflowSchema } from "@/lib/validation/workflows";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await context.params;

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        forms: true,
      },
    });

    if (!workflow) {
      throw new ApiError("WORKFLOW_NOT_FOUND", "Workflow not found.", 404);
    }

    return Response.json({ workflow });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const user = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await req.json();
    const input = createWorkflowSchema.parse(body);
    await assertChildFormsExist(input.definition);

    const existing = await db.workflow.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError("WORKFLOW_NOT_FOUND", "Workflow not found.", 404);
    }

    const workflow = await db.workflow.update({
      where: { id },
      data: {
        name: input.name,
        definition: input.definition as Prisma.InputJsonValue,
        version: existing.version + 1,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "workflow.updated",
      resourceType: "workflow",
      resourceId: workflow.id,
      beforeState: existing,
      afterState: workflow,
    });

    return Response.json({ workflow });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

async function assertChildFormsExist(definition: Array<{ childFormId?: string }>) {
  const childFormIds = definition
    .map((stage) => stage.childFormId)
    .filter((id): id is string => Boolean(id));

  if (childFormIds.length === 0) {
    return;
  }

  const forms = await db.form.findMany({
    where: { id: { in: childFormIds } },
    select: { id: true },
  });

  const foundIds = new Set(forms.map((form) => form.id));
  const missingId = childFormIds.find((id) => !foundIds.has(id));

  if (missingId) {
    throw new ApiError(
      "CHILD_FORM_NOT_FOUND",
      `Child form ${missingId} does not exist.`,
      404,
    );
  }
}
