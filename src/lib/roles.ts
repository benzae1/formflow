import type { Role } from "@prisma/client";
import type { FormioSchema } from "@/lib/formio-schema";
import { visitFormioComponents } from "@/lib/formio-schema";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { BUILT_IN_ROLE_NAMES } from "@/domain/roles";

const BUILT_IN_ROLE_NAME_SET = new Set<string>(BUILT_IN_ROLE_NAMES);

type WorkflowRoleReference = {
  stageId: string | null;
  stageName: string | null;
  stageIndex: number;
};

export type RoleDeletionBlockers = {
  assignedUserCount: number;
  forms: Array<{ id: string; slug: string; title: string }>;
  workflows: Array<{ id: string; name: string }>;
  pooledApprovalTasks: Array<{ id: string; submissionId: string; stageIndex: number }>;
};

export function isBuiltInRoleName(name: string) {
  return BUILT_IN_ROLE_NAME_SET.has(name);
}

export async function resolveRoleNamesOrThrow(roleNames: string[]) {
  const uniqueRoleNames = Array.from(new Set(roleNames));

  if (uniqueRoleNames.length === 0) {
    return [];
  }

  const roles = await db.role.findMany({
    where: {
      name: {
        in: uniqueRoleNames,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (roles.length !== uniqueRoleNames.length) {
    const foundNames = new Set(roles.map((role) => role.name));
    const missingRoles = uniqueRoleNames.filter((roleName) => !foundNames.has(roleName));

    throw new ApiError(
      "ROLE_NOT_FOUND",
      `Unknown role: ${missingRoles.join(", ")}.`,
      400,
    );
  }

  return roles;
}

export function sortRoles<T extends Pick<Role, "name">>(roles: T[]) {
  return [...roles].sort((left, right) => {
    const leftBuiltIn = isBuiltInRoleName(left.name);
    const rightBuiltIn = isBuiltInRoleName(right.name);

    if (leftBuiltIn !== rightBuiltIn) {
      return leftBuiltIn ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function toRoleResponse<T extends Pick<Role, "id" | "name" | "label" | "createdAt">>(
  role: T,
) {
  return {
    ...role,
    protected: isBuiltInRoleName(role.name),
  };
}

export async function assertRoleRenameIsSafe(role: Pick<Role, "id" | "name">) {
  const blockers = await getRoleDeletionBlockers(role.name);

  if (
    blockers.forms.length === 0 &&
    blockers.workflows.length === 0 &&
    blockers.pooledApprovalTasks.length === 0
  ) {
    return;
  }

  throw new ApiError(
    "ROLE_RENAME_BLOCKED",
    `Role "${role.name}" is referenced by forms, workflows, or active pooled approval tasks and cannot be renamed safely.`,
    409,
  );
}

export async function assertRoleDeletionIsSafe(role: Pick<Role, "id" | "name">) {
  if (isBuiltInRoleName(role.name)) {
    throw new ApiError(
      "ROLE_PROTECTED",
      `Built-in role "${role.name}" cannot be deleted.`,
      403,
    );
  }

  const blockers = await getRoleDeletionBlockers(role.name);
  const reasons: string[] = [];

  if (blockers.assignedUserCount > 0) {
    reasons.push(`${blockers.assignedUserCount} user(s) still have this role`);
  }

  if (blockers.forms.length > 0) {
    reasons.push(`${blockers.forms.length} form(s) still reference it in field access rules`);
  }

  if (blockers.workflows.length > 0) {
    reasons.push(`${blockers.workflows.length} workflow definition(s) still target it`);
  }

  if (blockers.pooledApprovalTasks.length > 0) {
    reasons.push(`${blockers.pooledApprovalTasks.length} pending pooled approval task(s) still depend on it`);
  }

  if (reasons.length === 0) {
    return;
  }

  throw new ApiError(
    "ROLE_IN_USE",
    `Role "${role.name}" cannot be deleted because ${reasons.join(", ")}.`,
    409,
  );
}

export async function getRoleDeletionBlockers(roleName: string): Promise<RoleDeletionBlockers> {
  const [assignedUserCount, forms, workflows, pendingTasks] = await Promise.all([
    db.user.count({
      where: {
        roles: {
          some: {
            name: roleName,
          },
        },
      },
    }),
    db.form.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        schema: true,
      },
    }),
    db.workflow.findMany({
      select: {
        id: true,
        name: true,
        definition: true,
      },
    }),
    db.approvalTask.findMany({
      where: {
        status: "pending",
      },
      select: {
        id: true,
        stageIndex: true,
        submissionId: true,
        submission: {
          select: {
            workflowDefinition: true,
          },
        },
      },
    }),
  ]);

  return {
    assignedUserCount,
    forms: forms
      .filter((form) => formSchemaUsesRole(form.schema, roleName))
      .map(({ id, slug, title }) => ({ id, slug, title })),
    workflows: workflows
      .filter((workflow) => workflowDefinitionUsesRole(workflow.definition, roleName))
      .map(({ id, name }) => ({ id, name })),
    pooledApprovalTasks: pendingTasks
      .filter((task) =>
        workflowStageUsesRole(task.submission.workflowDefinition, task.stageIndex, roleName),
      )
      .map(({ id, submissionId, stageIndex }) => ({ id, submissionId, stageIndex })),
  };
}

function formSchemaUsesRole(schema: unknown, roleName: string) {
  let found = false;

  visitFormioComponents(schema as FormioSchema, (component) => {
    const readRoles = parseRoleList(component.properties?.readRoles);
    if (readRoles.includes(roleName)) {
      found = true;
    }
  });

  return found;
}

function workflowDefinitionUsesRole(definition: unknown, roleName: string) {
  return findWorkflowRoleReferences(definition, roleName).length > 0;
}

function workflowStageUsesRole(definition: unknown, stageIndex: number, roleName: string) {
  const references = findWorkflowRoleReferences(definition, roleName);
  return references.some((reference) => reference.stageIndex === stageIndex);
}

function findWorkflowRoleReferences(definition: unknown, roleName: string): WorkflowRoleReference[] {
  if (!Array.isArray(definition)) {
    return [];
  }

  const matches: WorkflowRoleReference[] = [];

  definition.forEach((rawStage, stageIndex) => {
    if (typeof rawStage !== "object" || rawStage === null) {
      return;
    }

    const stage = rawStage as Record<string, unknown>;
    const targets = Array.isArray(stage.assignTo)
      ? stage.assignTo
      : stage.assignTo
        ? [stage.assignTo]
        : [];

    const usesRole = targets.some((target) => {
      if (typeof target !== "object" || target === null) {
        return false;
      }

      const targetRecord = target as Record<string, unknown>;
      return targetRecord.type === "role" && targetRecord.value === roleName;
    });

    if (!usesRole) {
      return;
    }

    matches.push({
      stageId: typeof stage.id === "string" ? stage.id : null,
      stageName: typeof stage.name === "string" ? stage.name : null,
      stageIndex,
    });
  });

  return matches;
}

function parseRoleList(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
