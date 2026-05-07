import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/ui";
import OrgSyncButton from "./OrgSyncButton";

export default async function AdminOrgPage() {
  await requirePageRole(["admin"]);

  const [units, users] = await Promise.all([
    db.orgUnit.findMany({
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    db.user.findMany({
      where: {
        externalId: { not: null },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization sync"
        title="Directory and routing cache"
        description="Inspect the current org graph, verify manager/head resolution, and refresh development data from the adapter."
      >
        <OrgSyncButton />
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Synced users", String(users.length)],
          [
            "Deactivated users",
            String(users.filter((user) => user.deactivatedAt).length),
          ],
          ["Most recent sync", formatDateTime(users[0]?.updatedAt ?? null)],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] px-5 py-5 shadow-[var(--shadow-md)]"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              {label}
            </p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {units.map((unit) => (
          <article
            key={unit.id}
            className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)]"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              {unit.type}
            </p>
            <h2 className="mt-3 text-2xl font-semibold">{unit.name}</h2>
            <div className="mt-4 space-y-3">
              {unit.memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="rounded-[20px] border border-black/10 bg-white/90 px-4 py-3"
                >
                  <p className="text-sm font-semibold">
                    {membership.user.name ?? membership.user.email}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {membership.roleInUnit ?? "member"}
                    {membership.isManager ? " • manager" : ""}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
