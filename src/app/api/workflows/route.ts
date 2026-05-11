import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { createWorkflowSchema } from "@/lib/validation/workflows";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const workflows = await db.workflow.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({ workflows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    assertMutationRequest(req);
    const user = await requireRole(["admin"]);
    const body = await req.json();
    const input = createWorkflowSchema.parse(body);
    await assertChildFormsExist(input.definition);

    const workflow = await db.workflow.create({
      data: {
        name: input.name,
        definition: input.definition as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "workflow.created",
      resourceType: "workflow",
      resourceId: workflow.id,
      afterState: workflow,
    });

    return Response.json({ workflow }, { status: 201 });
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
