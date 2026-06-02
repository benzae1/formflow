import { PageHeader } from "@/components/ui/PageHeader";
import { db } from "@/lib/db";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/page-auth";
import { sortRoles, toRoleResponse } from "@/lib/roles";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage({
  params,
}: {
  params?: Promise<{ lang?: string }>;
}) {
  const { locale, dictionary } = await getLocaleContextOrDefault(
    params ? (await params).lang : undefined,
  );
  await requirePageRole(["admin"], locale);

  const [users, rawRoles, delegations] = await Promise.all([
    db.user.findMany({
      include: {
        roles: true,
        memberships: {
          include: {
            orgUnit: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.role.findMany(),
    db.delegation.findMany({
      include: {
        delegate: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startsAt: "desc",
      },
    }),
  ]);
  const roles = sortRoles(rawRoles);

  const delegateOptions = users
    .filter(
      (user) =>
        !user.deactivatedAt &&
        user.roles.some((role) => role.name === "approver" || role.name === "admin"),
    )
    .map((user) => ({
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dictionary.adminUsers.pageEyebrow}
        title={dictionary.adminUsers.pageTitle}
        description={dictionary.adminUsers.pageDescription}
      />

      <AdminUsersClient
        users={users.map((user) => ({
          ...user,
          roles: user.roles.map((role) => toRoleResponse(role)),
          updatedAt: user.updatedAt.toISOString(),
          deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
        }))}
        availableRoles={roles.map((role) => toRoleResponse(role))}
        delegations={delegations.map((delegation) => ({
          id: delegation.id,
          approverId: delegation.approverId,
          delegateId: delegation.delegateId,
          delegateName: delegation.delegate.name ?? delegation.delegate.email,
          startsAt: delegation.startsAt.toISOString(),
          endsAt: delegation.endsAt.toISOString(),
        }))}
        delegateOptions={delegateOptions}
        locale={locale}
        dictionary={dictionary}
      />
    </div>
  );
}
