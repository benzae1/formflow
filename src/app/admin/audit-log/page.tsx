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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit trail"
        title="Sensitive access and control-plane events"
        description="Compliance and admin can filter the latest audit entries, inspect actor/resource combinations, and export the current slice."
      >
        <Link
          href={`/api/audit-log?${exportParams.toString()}`}
          className=" bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Export CSV
        </Link>
      </PageHeader>

      <form className="flex flex-col gap-3 border border-[var(--line)] bg-[var(--panel)] p-5 lg:flex-row">
        <input
          name="action"
          defaultValue={filters.action ?? ""}
          placeholder="Action filter"
          className=" border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <input
          name="resourceType"
          defaultValue={filters.resourceType ?? ""}
          placeholder="Resource type"
          className=" border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <input
          name="actorId"
          defaultValue={filters.actorId ?? ""}
          placeholder="Actor ID"
          className=" border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <button
          type="submit"
          className=" bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Filter
        </button>
      </form>

      <section className="space-y-3">
        {page.map((log) => (
          <article
            key={log.id}
            className=" border border-[var(--line)] bg-[var(--panel)] p-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                  {log.resourceType}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{log.action}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Resource {log.resourceId} • Actor {log.actorId ?? "system"} •{" "}
                  {formatDateTime(log.createdAt)}
                </p>
              </div>
              {log.action === "sensitive.accessed" ? (
                <span className=" border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--danger)]">
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
            className=" border border-[var(--line)] bg-[var(--panel)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Load next {PAGE_SIZE}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
