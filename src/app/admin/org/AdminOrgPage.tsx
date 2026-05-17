import { db } from "@/lib/db";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import { formatDateTime } from "@/lib/ui";
import OrgSyncButton from "./OrgSyncButton";

export default async function AdminOrgPage({
  params,
}: {
  params?: Promise<{ lang?: string }>;
}) {
  const { locale } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  await requirePageRole(["admin"], locale);

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
    <div className="bf-stack">
      <PageHeader
        eyebrow={locale === "de" ? "Organisationsabgleich" : "Organization sync"}
        title={locale === "de" ? "Verzeichnis und Routing-Cache" : "Directory and routing cache"}
        description={
          locale === "de"
            ? "Prüfen Sie den aktuellen Organisationsgraphen, kontrollieren Sie Leitungsauflösungen und aktualisieren Sie Entwicklungsdaten über den Adapter."
            : "Inspect the current org graph, verify manager and head resolution, and refresh development data from the adapter."
        }
      >
        <OrgSyncButton locale={locale} />
      </PageHeader>

      <section className="bf-metrics md:grid-cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {[
          [
            locale === "de" ? "Synchronisierte Benutzer" : "Synced users",
            String(users.length),
          ],
          [
            locale === "de" ? "Deaktivierte Benutzer" : "Deactivated users",
            String(users.filter((user) => user.deactivatedAt).length),
          ],
          [
            locale === "de" ? "Letzte Synchronisation" : "Most recent sync",
            formatDateTime(users[0]?.updatedAt ?? null, locale),
          ],
        ].map(([label, value], index) => (
          <article key={label} className="bf-metric-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bf-eyebrow">{label}</p>
                <p className="bf-metric-value">{value}</p>
              </div>
              <PrimitiveMark
                shape={index === 0 ? "circle" : index === 1 ? "square" : "triangle"}
                color={index === 0 ? "var(--haus-teal)" : index === 1 ? "var(--haus-red)" : "var(--haus-yellow)"}
              />
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {units.map((unit, index) => (
          <article key={unit.id} className="bf-list-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bf-eyebrow">{unit.type}</p>
                <h2 className="mt-3 text-[30px] font-extrabold leading-none">{unit.name}</h2>
              </div>
              <PrimitiveMark
                shape={index % 3 === 0 ? "square" : index % 3 === 1 ? "circle" : "triangle"}
                color={index % 3 === 0 ? "var(--haus-red)" : index % 3 === 1 ? "var(--haus-teal)" : "var(--haus-yellow)"}
              />
            </div>

            <div className="mt-4 bf-list">
              {unit.memberships.map((membership) => (
                <div key={membership.id} className="bf-panel-muted px-4 py-3">
                <p className="text-sm font-semibold">{membership.user.name ?? membership.user.email}</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    {membership.roleInUnit ?? (locale === "de" ? "Mitglied" : "member")}
                    {membership.isManager ? ` | ${locale === "de" ? "Leitung" : "manager"}` : ""}
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
