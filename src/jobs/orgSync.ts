import { OrgAdapter } from "@/domain/org";
import { db } from "@/lib/db";

export async function syncOrg(adapter: OrgAdapter) {
  const [externalUsers, externalUnits, externalMemberships] =
    await Promise.all([
      adapter.fetchUsers(),
      adapter.fetchOrgUnits(),
      adapter.fetchMemberships(),
    ]);

  for (const user of externalUsers) {
    await db.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        externalId: user.externalId,
        deactivatedAt: user.active ? null : new Date(),
      },
      create: {
        email: user.email,
        name: user.name,
        externalId: user.externalId,
        roles: ["submitter"],
      },
    });
  }

  for (const unit of externalUnits) {
    const parent = unit.parentExternalId
      ? await db.orgUnit.findUnique({
          where: { externalId: unit.parentExternalId },
        })
      : null;

    await db.orgUnit.upsert({
      where: { externalId: unit.externalId },
      update: {
        name: unit.name,
        type: unit.type,
        parentId: parent?.id ?? null,
      },
      create: {
        externalId: unit.externalId,
        name: unit.name,
        type: unit.type,
        parentId: parent?.id ?? null,
      },
    });
  }

  for (const membership of externalMemberships) {
    const user = await db.user.findFirst({
      where: { externalId: membership.userExternalId },
    });

    const orgUnit = await db.orgUnit.findUnique({
      where: { externalId: membership.orgUnitExternalId },
    });

    if (!user || !orgUnit) continue;

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
}
