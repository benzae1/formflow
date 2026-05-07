import { RoutingTarget } from "@/domain/workflow";
import { db } from "@/lib/db";

export async function resolveAssignees(
  target: RoutingTarget | RoutingTarget[],
  submitterId: string,
): Promise<string[]> {
  const targets = Array.isArray(target) ? target : [target];

  const result = new Set<string>();

  for (const item of targets) {
    const ids = await resolveSingleTarget(item, submitterId);
    ids.forEach((id) => result.add(id));
  }

  return Array.from(result);
}

async function resolveSingleTarget(
  target: RoutingTarget,
  submitterId: string,
): Promise<string[]> {
  if (target.type === "user") {
    return [target.value];
  }

  if (target.type === "role") {
    const users = await db.user.findMany({
      where: {
        roles: {
          has: target.value as never,
        },
        deactivatedAt: null,
      },
      select: { id: true },
    });

    return users.map((u) => u.id);
  }

  if (target.type === "group") {
    const memberships = await db.orgMembership.findMany({
      where: {
        orgUnitId: target.value,
      },
      select: {
        userId: true,
      },
    });

    return memberships.map((m) => m.userId);
  }

  if (target.type === "org") {
    return resolveOrgTarget(target.value, submitterId);
  }

  return [];
}

async function resolveOrgTarget(value: string, submitterId: string) {
  if (value === "submitter.manager") {
    const submitterMembership = await db.orgMembership.findFirst({
      where: { userId: submitterId },
      include: {
        orgUnit: {
          include: {
            memberships: true,
          },
        },
      },
    });

    const manager = submitterMembership?.orgUnit.memberships.find(
      (m) => m.isManager && m.userId !== submitterId,
    );

    return manager ? [manager.userId] : [];
  }

  if (value === "department.head") {
    const submitterMembership = await db.orgMembership.findFirst({
      where: { userId: submitterId },
      include: {
        orgUnit: {
          include: {
            memberships: true,
          },
        },
      },
    });

    const head = submitterMembership?.orgUnit.memberships.find(
      (m) => m.roleInUnit === "head",
    );

    return head ? [head.userId] : [];
  }

  return [];
}
