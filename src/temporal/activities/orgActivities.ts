import { RoutingTarget } from "@/domain/workflow";
import { db } from "@/lib/db";
import { syncOrg } from "@/jobs/orgSync";
import { devOrgAdapter } from "@/jobs/devOrgAdapter";
import { createLdapOrgAdapter } from "@/jobs/ldapOrgAdapter";
import { isLdapConfigured } from "@/lib/ldap";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function runScheduledOrgSync() {
  logger.info("Scheduled org sync started");

  await writeAuditLog({
    action: "org.sync.scheduled",
    resourceType: "org",
    resourceId: "scheduled-sync",
  });

  await syncOrg(isLdapConfigured() ? createLdapOrgAdapter() : devOrgAdapter);

  await writeAuditLog({
    action: "org.sync.completed",
    resourceType: "org",
    resourceId: "scheduled-sync",
  });

  logger.info("Scheduled org sync completed");
}

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
          some: {
            name: target.value,
          },
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
  const submitterMembership = await db.orgMembership.findFirst({
    where: { userId: submitterId },
    include: {
      orgUnit: {
        include: {
          memberships: true,
          parent: {
            include: {
              memberships: true,
              parent: {
                include: {
                  memberships: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (value === "submitter.manager") {
    const manager = submitterMembership?.orgUnit.memberships.find(
      (membership) => membership.isManager && membership.userId !== submitterId,
    );

    return manager ? [manager.userId] : [];
  }

  if (value === "submitter.skip-level") {
    const skipLevelManager = submitterMembership?.orgUnit.parent?.memberships.find(
      (membership) => membership.isManager,
    );

    return skipLevelManager ? [skipLevelManager.userId] : [];
  }

  if (value === "department.head") {
    const department =
      submitterMembership?.orgUnit.type === "department"
        ? submitterMembership.orgUnit
        : submitterMembership?.orgUnit.parent;

    const head = department?.memberships.find(
      (membership) =>
        membership.roleInUnit === "head" || membership.isManager,
    );

    return head ? [head.userId] : [];
  }

  return [];
}
