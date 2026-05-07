import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/ui";

export default async function AdminUsersPage() {
  await requirePageRole(["admin"]);

  const [users, delegations] = await Promise.all([
    db.user.findMany({
      include: {
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
    db.delegation.findMany({
      orderBy: {
        startsAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Users and routing context"
        description="Review who is active in the system, which org units they belong to, and how delegation windows affect task assignment."
      />

      <section className="space-y-3">
        {users.map((user) => {
          const outgoingDelegations = delegations.filter(
            (delegation) => delegation.approverId === user.id,
          );

          return (
            <article
              key={user.id}
              className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)]"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {user.name ?? user.email}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{user.email}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Updated {formatDateTime(user.updatedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <StatusBadge key={role} status={role} />
                  ))}
                  {user.deactivatedAt ? <StatusBadge status="archived" /> : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                    Org memberships
                  </p>
                  <div className="mt-3 space-y-2">
                    {user.memberships.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No memberships synced.</p>
                    ) : (
                      user.memberships.map((membership) => (
                        <p key={membership.id} className="text-sm leading-7 text-[var(--ink)]">
                          {membership.orgUnit.name} • {membership.roleInUnit ?? "member"}
                          {membership.isManager ? " • manager" : ""}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                    Delegation
                  </p>
                  <div className="mt-3 space-y-2">
                    {outgoingDelegations.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No active delegation records.</p>
                    ) : (
                      outgoingDelegations.map((delegation) => (
                        <p key={delegation.id} className="text-sm leading-7 text-[var(--ink)]">
                          Delegate {delegation.delegateId} • {formatDateTime(delegation.startsAt)} to{" "}
                          {formatDateTime(delegation.endsAt)}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
