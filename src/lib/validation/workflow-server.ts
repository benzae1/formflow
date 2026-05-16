import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { workflowStageSchema } from "@/lib/validation/workflows";

export async function assertChildFormsExist(definition: Array<{ childFormId?: string }>) {
  const childFormIds = definition
    .map((stage) => stage.childFormId)
    .filter((id): id is string => Boolean(id));

  if (childFormIds.length === 0) return;

  const forms = await db.form.findMany({
    where: { id: { in: childFormIds } },
    select: { id: true },
  });

  const foundIds = new Set(forms.map((form) => form.id));
  const missingId = childFormIds.find((id) => !foundIds.has(id));

  if (missingId) {
    throw new ApiError("CHILD_FORM_NOT_FOUND", `Child form ${missingId} does not exist.`, 404);
  }
}

type StageWithAssignTo = { assignTo?: unknown };

function collectTargetsByType(definition: StageWithAssignTo[], type: string): string[] {
  const values = new Set<string>();

  for (const stage of definition) {
    const targets = Array.isArray(stage.assignTo)
      ? stage.assignTo
      : stage.assignTo
        ? [stage.assignTo]
        : [];

    for (const target of targets) {
      if (
        target !== null &&
        typeof target === "object" &&
        "type" in target &&
        (target as Record<string, unknown>).type === type &&
        "value" in target
      ) {
        values.add(String((target as Record<string, unknown>).value));
      }
    }
  }

  return [...values];
}

export async function assertRoleTargetsExist(definition: StageWithAssignTo[]) {
  const roleNames = collectTargetsByType(definition, "role");

  if (roleNames.length === 0) return;

  const roles = await db.role.findMany({
    where: { name: { in: roleNames } },
    select: { name: true },
  });

  const foundNames = new Set(roles.map((r) => r.name));
  const missingName = roleNames.find((name) => !foundNames.has(name));

  if (missingName) {
    throw new ApiError(
      "ROLE_NOT_FOUND",
      `Role "${missingName}" does not exist. Check the available roles or create it first.`,
      422,
    );
  }
}

export async function assertGroupTargetsResolvable(definition: StageWithAssignTo[]) {
  const groupIds = collectTargetsByType(definition, "group");

  if (groupIds.length === 0) return;

  const units = await db.orgUnit.findMany({
    where: { id: { in: groupIds } },
    select: {
      id: true,
      name: true,
      _count: { select: { memberships: true } },
    },
  });

  const foundIds = new Set(units.map((u) => u.id));
  const missingId = groupIds.find((id) => !foundIds.has(id));

  if (missingId) {
    throw new ApiError(
      "GROUP_NOT_FOUND",
      `Org group ${missingId} does not exist.`,
      422,
    );
  }

  const emptyUnit = units.find((u) => u._count.memberships === 0);
  if (emptyUnit) {
    throw new ApiError(
      "GROUP_EMPTY",
      `Group "${emptyUnit.name}" has no members and would leave the stage unassigned. Add members or choose a different routing target.`,
      422,
    );
  }
}

export async function assertWorkflowRunnable(workflowId: string) {
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

  const result = workflowStageSchema.array().safeParse(workflow.definition);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new ApiError(
      "WORKFLOW_INVALID",
      `Workflow definition is malformed: ${firstIssue?.message ?? "unknown error"}`,
      409,
    );
  }

  await assertGroupTargetsResolvable(result.data);
}
