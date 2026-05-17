import { PageHeader } from "@/components/ui/PageHeader";
import { db } from "@/lib/db";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/page-auth";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage({
  params,
}: {
  params?: Promise<{ lang?: string }>;
}) {
  const { locale } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  await requirePageRole(["admin"], locale);

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
        eyebrow={locale === "de" ? "Verzeichnis" : "Directory"}
        title={locale === "de" ? "Benutzer und Routing-Kontext" : "Users and routing context"}
        description={
          locale === "de"
            ? "Prüfen Sie aktive Konten, passen Sie Rollenabdeckung an und legen Sie Vertretungszeiträume fest, damit das Routing verlässlich bleibt."
            : "Review who is active, adjust role coverage, and set delegation windows so routing stays reliable."
        }
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
        locale={locale}
      />
    </div>
  );
}
