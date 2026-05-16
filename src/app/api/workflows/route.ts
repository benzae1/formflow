import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";
import { createWorkflowSchema } from "@/lib/validation/workflows";
import { assertChildFormsExist, assertRoleTargetsExist } from "@/lib/validation/workflow-server";

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
    await assertRoleTargetsExist(input.definition);
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
