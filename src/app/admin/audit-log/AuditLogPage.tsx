import Link from "next/link";
import { db } from "@/lib/db";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/ui";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  action?: string;
  resourceType?: string;
  actorId?: string;
  cursor?: string;
}>;

export default async function AuditLogPage({
  searchParams,
  params,
}: {
  searchParams: SearchParams;
  params?: Promise<{ lang?: string }>;
}) {
  const { locale } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  await requirePageRole(["admin", "compliance"], locale);
  const filters = await searchParams;

  const where = {
    action: filters.action ?? undefined,
    resourceType: filters.resourceType ?? undefined,
    actorId: filters.actorId ?? undefined,
  };

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasNextPage = logs.length > PAGE_SIZE;
  const page = hasNextPage ? logs.slice(0, PAGE_SIZE) : logs;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : null;

  const exportParams = new URLSearchParams();
  if (filters.action) exportParams.set("action", filters.action);
  if (filters.resourceType) exportParams.set("resourceType", filters.resourceType);
  if (filters.actorId) exportParams.set("actorId", filters.actorId);
  exportParams.set("format", "csv");

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow={locale === "de" ? "Audit-Spur" : "Audit trail"}
        title={locale === "de" ? "Sensible Zugriffe und Steuerungsereignisse" : "Sensitive access and control-plane events"}
        description={
          locale === "de"
            ? "Compliance und Administration können aktuelle Audit-Einträge filtern, Akteur-Ressourcen-Kombinationen prüfen und den aktuellen Ausschnitt exportieren."
            : "Compliance and admin can filter the latest audit entries, inspect actor-resource combinations, and export the current slice."
        }
      >
        <Link href={`/api/audit-log?${exportParams.toString()}`} className="bf-btn bf-btn-primary">
          {locale === "de" ? "CSV exportieren" : "Export CSV"}
        </Link>
      </PageHeader>

      <form className="bf-filter-bar">
        <input
          name="action"
          defaultValue={filters.action ?? ""}
          placeholder={locale === "de" ? "Aktion filtern" : "Action filter"}
          className="bf-input"
        />
        <input
          name="resourceType"
          defaultValue={filters.resourceType ?? ""}
          placeholder={locale === "de" ? "Ressourcentyp" : "Resource type"}
          className="bf-input"
        />
        <input
          name="actorId"
          defaultValue={filters.actorId ?? ""}
          placeholder={locale === "de" ? "Akteur-ID" : "Actor ID"}
          className="bf-input"
        />
        <button type="submit" className="bf-btn bf-btn-primary">
          {locale === "de" ? "Filtern" : "Filter"}
        </button>
      </form>

      <section className="bf-list">
        {page.map((log) => (
          <article key={log.id} className="bf-list-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="bf-eyebrow">{log.resourceType}</p>
                <h2 className="mt-3 text-[28px] font-extrabold leading-none">{log.action}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                  {locale === "de" ? "Ressource" : "Resource"} {log.resourceId} | {locale === "de" ? "Akteur" : "Actor"}{" "}
                  {log.actorId ?? (locale === "de" ? "System" : "system")} | {formatDateTime(log.createdAt, locale)}
                </p>
              </div>
              {log.action === "sensitive.accessed" ? (
                <span
                  className="bf-pill"
                  style={{ borderColor: "var(--haus-red)", background: "var(--accent-soft)" }}
                >
                  {locale === "de" ? "Sensibel" : "Sensitive"}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={`${localizePath(locale, "/admin/audit-log")}?${new URLSearchParams({
              ...(filters.action ? { action: filters.action } : {}),
              ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
              ...(filters.actorId ? { actorId: filters.actorId } : {}),
              cursor: nextCursor,
            }).toString()}`}
            className="bf-btn"
          >
            {locale === "de" ? `Nächste ${PAGE_SIZE} laden` : `Load next ${PAGE_SIZE}`}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
