import Link from "next/link";
import { db } from "@/lib/db";
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
}: {
  searchParams: SearchParams;
}) {
  await requirePageRole(["admin", "compliance"]);
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
        eyebrow="Audit trail"
        title="Sensitive access and control-plane events"
        description="Compliance and admin can filter the latest audit entries, inspect actor-resource combinations, and export the current slice."
      >
        <Link href={`/api/audit-log?${exportParams.toString()}`} className="bf-btn bf-btn-primary">
          Export CSV
        </Link>
      </PageHeader>

      <form className="bf-filter-bar">
        <input name="action" defaultValue={filters.action ?? ""} placeholder="Action filter" className="bf-input" />
        <input
          name="resourceType"
          defaultValue={filters.resourceType ?? ""}
          placeholder="Resource type"
          className="bf-input"
        />
        <input name="actorId" defaultValue={filters.actorId ?? ""} placeholder="Actor ID" className="bf-input" />
        <button type="submit" className="bf-btn bf-btn-primary">
          Filter
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
                  Resource {log.resourceId} | Actor {log.actorId ?? "system"} | {formatDateTime(log.createdAt)}
                </p>
              </div>
              {log.action === "sensitive.accessed" ? (
                <span
                  className="bf-pill"
                  style={{ borderColor: "var(--haus-red)", background: "var(--accent-soft)" }}
                >
                  Sensitive
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={`/admin/audit-log?${new URLSearchParams({
              ...(filters.action ? { action: filters.action } : {}),
              ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
              ...(filters.actorId ? { actorId: filters.actorId } : {}),
              cursor: nextCursor,
            }).toString()}`}
            className="bf-btn"
          >
            Load next {PAGE_SIZE}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
