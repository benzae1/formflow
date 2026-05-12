import { PageHeader } from "@/components/ui/PageHeader";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  await requirePageRole(["admin"]);

  const [users, roles, delegations] = await Promise.all([
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
    db.role.findMany({
      orderBy: {
        name: "asc",
      },
    }),
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
        eyebrow="Directory"
        title="Users and routing context"
        description="Review who is active, adjust role coverage, and set delegation windows so routing stays reliable."
      />

      <AdminUsersClient
        users={users.map((user) => ({
          ...user,
          roles: user.roles.map((role) => ({
            name: role.name,
            label: role.label,
          })),
          updatedAt: user.updatedAt.toISOString(),
          deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
        }))}
        availableRoles={roles.map((role) => ({
          name: role.name,
          label: role.label,
        }))}
        delegations={delegations.map((delegation) => ({
          id: delegation.id,
          approverId: delegation.approverId,
          delegateId: delegation.delegateId,
          delegateName: delegation.delegate.name ?? delegation.delegate.email,
          startsAt: delegation.startsAt.toISOString(),
          endsAt: delegation.endsAt.toISOString(),
        }))}
        delegateOptions={delegateOptions}
      />
    </div>
  );
}
