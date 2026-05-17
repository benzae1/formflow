import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import type { WorkflowDefinition } from "@/domain/workflow";
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

type StageWithAssignTo = {
  id?: string;
  assignTo?: unknown;
  onReject?: unknown;
};

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

export async function assertUserTargetsActive(definition: StageWithAssignTo[]) {
  const userIds = collectTargetsByType(definition, "user");

  if (userIds.length === 0) return;

  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, deactivatedAt: true },
  });

  const activeIds = new Set(
    users.filter((user) => user.deactivatedAt === null).map((user) => user.id),
  );
  const knownIds = new Set(users.map((user) => user.id));

  const missingId = userIds.find((id) => !knownIds.has(id));
  if (missingId) {
    throw new ApiError(
      "USER_NOT_FOUND",
      `User "${missingId}" does not exist. Choose an active user or a different routing target.`,
      422,
    );
  }

  const deactivatedId = userIds.find((id) => !activeIds.has(id));
  if (deactivatedId) {
    throw new ApiError(
      "USER_DEACTIVATED",
      `User "${deactivatedId}" is deactivated and cannot receive workflow tasks.`,
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

export function assertGoToTargetsExist(definition: WorkflowDefinition) {
  const stageIds = new Set(definition.map((stage) => stage.id));

  for (const stage of definition) {
    const goTo =
      typeof stage.onReject === "object" && stage.onReject !== null && "goTo" in stage.onReject
        ? String((stage.onReject as { goTo: string }).goTo)
        : null;

    if (goTo && !stageIds.has(goTo)) {
      throw new ApiError(
        "WORKFLOW_INVALID",
        `Stage "${stage.name || stage.id}" routes to missing stage "${goTo}".`,
        422,
      );
    }
  }
}

export async function assertOrgTargetsResolvable(definition: StageWithAssignTo[]) {
  const orgTargets = collectTargetsByType(definition, "org");

  if (orgTargets.length === 0) return;

  const units = await db.orgUnit.findMany({
    include: {
      memberships: {
        include: {
          user: {
            select: { deactivatedAt: true },
          },
        },
      },
      parent: {
        include: {
          memberships: {
            include: {
              user: {
                select: { deactivatedAt: true },
              },
            },
          },
        },
      },
    },
  });

  const hasResolvableTarget = (target: string) => {
    if (target === "submitter.manager") {
      return units.some((unit) => {
        const hasActiveSubmitter = unit.memberships.some(
          (membership) => !membership.isManager && membership.user.deactivatedAt === null,
        );
        const hasActiveManager = unit.memberships.some(
          (membership) => membership.isManager && membership.user.deactivatedAt === null,
        );
        return hasActiveSubmitter && hasActiveManager;
      });
    }

    if (target === "submitter.skip-level") {
      return units.some((unit) => {
        const hasActiveSubmitter = unit.memberships.some(
          (membership) => !membership.isManager && membership.user.deactivatedAt === null,
        );
        const hasActiveParentManager = unit.parent?.memberships.some(
          (membership) => membership.isManager && membership.user.deactivatedAt === null,
        );
        return hasActiveSubmitter && hasActiveParentManager;
      });
    }

    if (target === "department.head") {
      return units.some((unit) => {
        const department = unit.type === "department" ? unit : unit.parent;
        return department?.memberships.some(
          (membership) =>
            membership.user.deactivatedAt === null &&
            (membership.roleInUnit === "head" || membership.isManager),
        );
      });
    }

    return false;
  };

  const unresolvedTarget = orgTargets.find((target) => !hasResolvableTarget(target));
  if (unresolvedTarget) {
    throw new ApiError(
      "ORG_TARGET_UNRESOLVABLE",
      `Org routing target "${unresolvedTarget}" cannot currently resolve to any active user.`,
      422,
    );
  }
}

export async function assertWorkflowDefinitionRunnable(definition: WorkflowDefinition) {
  await assertRoleTargetsExist(definition);
  await assertUserTargetsActive(definition);
  await assertChildFormsExist(definition);
  await assertGroupTargetsResolvable(definition);
  await assertOrgTargetsResolvable(definition);
  assertGoToTargetsExist(definition);
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

  await assertWorkflowDefinitionRunnable(result.data);
}
