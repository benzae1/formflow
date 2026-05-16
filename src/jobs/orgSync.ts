import { OrgAdapter } from "@/domain/org";
import { db } from "@/lib/db";
import { sendNotification } from "@/temporal/activities/notificationActivities";

export async function syncOrg(adapter: OrgAdapter) {
  const [externalUsers, externalUnits, externalMemberships] =
    await Promise.all([
      adapter.fetchUsers(),
      adapter.fetchOrgUnits(),
      adapter.fetchMemberships(),
    ]);

  const syncedUserExternalIds = new Set(
    externalUsers.map((user) => user.externalId),
  );
  const syncedUnitExternalIds = new Set(
    externalUnits.map((unit) => unit.externalId),
  );

  for (const user of externalUsers) {
    const deactivatedAt = user.active ? null : new Date();

    await db.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        externalId: user.externalId,
        deactivatedAt,
        ...(deactivatedAt
          ? {
              sessionVersion: {
                increment: 1,
              },
            }
          : {}),
      },
      create: {
        email: user.email,
        name: user.name,
        externalId: user.externalId,
        roles: { connect: [{ name: "submitter" }] },
      },
    });
  }

  const nowDeactivated: string[] = [];

  if (syncedUserExternalIds.size > 0) {
    const toDeactivate = await db.user.findMany({
      where: {
        externalId: { notIn: Array.from(syncedUserExternalIds) },
        deactivatedAt: null,
      },
      select: { id: true },
    });

    nowDeactivated.push(...toDeactivate.map((u) => u.id));

    await db.user.updateMany({
      where: {
        externalId: {
          notIn: Array.from(syncedUserExternalIds),
        },
      },
      data: {
        deactivatedAt: new Date(),
        sessionVersion: {
          increment: 1,
        },
      },
    });
  }

  await flagTasksForDeactivatedUsers(nowDeactivated);

  for (const unit of externalUnits) {
    await db.orgUnit.upsert({
      where: { externalId: unit.externalId },
      update: {
        name: unit.name,
        type: unit.type,
      },
      create: {
        externalId: unit.externalId,
        name: unit.name,
        type: unit.type,
      },
    });
  }

  for (const unit of externalUnits) {
    const parent = unit.parentExternalId
      ? await db.orgUnit.findUnique({
          where: { externalId: unit.parentExternalId },
          select: { id: true },
        })
      : null;

    await db.orgUnit.update({
      where: { externalId: unit.externalId },
      data: {
        parentId: parent?.id ?? null,
      },
    });
  }

  if (syncedUnitExternalIds.size > 0) {
    await db.orgMembership.deleteMany({
      where: {
        orgUnit: {
          externalId: {
            notIn: Array.from(syncedUnitExternalIds),
          },
        },
      },
    });

    await db.orgUnit.deleteMany({
      where: {
        externalId: {
          notIn: Array.from(syncedUnitExternalIds),
        },
      },
    });
  }

  const desiredMembershipPairs = new Set(
    externalMemberships.map(
      (membership) =>
        `${membership.userExternalId}::${membership.orgUnitExternalId}`,
    ),
  );

  for (const membership of externalMemberships) {
    const user = await db.user.findFirst({
      where: { externalId: membership.userExternalId },
      select: { id: true },
    });

    const orgUnit = await db.orgUnit.findUnique({
      where: { externalId: membership.orgUnitExternalId },
      select: { id: true },
    });

    if (!user || !orgUnit) {
      continue;
    }

    await db.orgMembership.upsert({
      where: {
        userId_orgUnitId: {
          userId: user.id,
          orgUnitId: orgUnit.id,
        },
      },
      update: {
        roleInUnit: membership.roleInUnit,
        isManager: membership.isManager,
      },
      create: {
        userId: user.id,
        orgUnitId: orgUnit.id,
        roleInUnit: membership.roleInUnit,
        isManager: membership.isManager,
      },
    });
  }

  const existingMemberships = await db.orgMembership.findMany({
    include: {
      user: {
        select: { externalId: true },
      },
      orgUnit: {
        select: { externalId: true },
      },
    },
  });

  const staleMembershipIds = existingMemberships
    .filter((membership) => {
      const userExternalId = membership.user.externalId;

      if (!userExternalId) {
        return true;
      }

      return !desiredMembershipPairs.has(
        `${userExternalId}::${membership.orgUnit.externalId}`,
      );
    })
    .map((membership) => membership.id);

  if (staleMembershipIds.length > 0) {
    await db.orgMembership.deleteMany({
      where: {
        id: {
          in: staleMembershipIds,
        },
      },
    });
  }
}

async function flagTasksForDeactivatedUsers(userIds: string[]) {
  if (userIds.length === 0) return;

  const stuckTasks = await db.approvalTask.findMany({
    where: {
      assignedToId: { in: userIds },
      status: "pending",
    },
    select: {
      id: true,
      submissionId: true,
      assignedToId: true,
    },
  });

  if (stuckTasks.length === 0) return;

  const admins = await db.user.findMany({
    where: { roles: { some: { name: "admin" } }, deactivatedAt: null },
    select: { id: true },
  });

  for (const admin of admins) {
    await sendNotification({
      userId: admin.id,
      type: "deactivated_user_tasks",
      title: "Open tasks need reassignment",
      body: `${stuckTasks.length} approval task(s) are assigned to newly deactivated users and need reassignment.`,
      linkUrl: "/admin/submissions",
      email: true,
    });
  }
}
