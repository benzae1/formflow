import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import { formatDateTime, titleCaseStatus } from "@/lib/ui";
import { canUserAccessForm } from "@/lib/form-access";

type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePageUser();
  const filters = await searchParams;
  const status = filters.status;
  const q = filters.q?.trim();

  const [submissions, publishedForms] = await Promise.all([
    db.submission.findMany({
      where: {
        submittedById: user.id,
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              form: {
                title: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            }
          : {}),
      },
      include: {
        form: true,
        approvalTasks: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.form.findMany({
      where: {
        status: "published",
      },
      include: {
        allowedRoles: {
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),
  ]);
  const visiblePublishedForms = publishedForms.filter((form) =>
    canUserAccessForm(user.roles, form.allowedRoles),
  );

  const buckets = [
    "draft",
    "submitted",
    "in_review",
    "needs_revision",
    "approved",
    "rejected",
    "closed",
  ] as const;

  const counts = Object.fromEntries(
    buckets.map((bucket) => [
      bucket,
      submissions.filter((submission) => submission.status === bucket).length,
    ]),
  ) as Record<(typeof buckets)[number], number>;

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow="Submitter workspace"
        title="My submissions"
        description="Start a published form, track every decision point, and jump back into drafts or revision requests without losing context."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {buckets.map((bucket, index) => (
          <article key={bucket} className="bf-metric-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bf-eyebrow">{titleCaseStatus(bucket)}</p>
                <p className="bf-metric-value">{counts[bucket]}</p>
              </div>
              <PrimitiveMark
                shape={index % 3 === 0 ? "square" : index % 3 === 1 ? "circle" : "triangle"}
                color={index % 3 === 0 ? "var(--haus-red)" : index % 3 === 1 ? "var(--haus-teal)" : "var(--haus-yellow)"}
              />
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bf-panel p-6">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="bf-eyebrow">Submission list</p>
              <h2 className="mt-3 text-[32px] font-extrabold leading-none">Current work</h2>
            </div>

            <form className="bf-filter-group">
              <input type="search" name="q" defaultValue={q} placeholder="Search by form title" className="bf-input" />
              <select name="status" defaultValue={status ?? ""} className="bf-select">
                <option value="">All statuses</option>
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {titleCaseStatus(bucket)}
                  </option>
                ))}
              </select>
              <button type="submit" className="bf-btn bf-btn-primary">
                Filter
              </button>
            </form>
          </div>

          {submissions.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                eyebrow="Nothing here yet"
                title="No submissions match this view"
                description="Try a different filter or start a fresh request from one of the published forms on the right."
              />
            </div>
          ) : (
            <div className="mt-5 bf-list">
              {submissions.map((submission) => {
                const isDraft = submission.status === "draft";
                const href = isDraft
                  ? `/forms/${submission.form.slug}?submissionId=${submission.id}`
                  : `/submissions/${submission.id}`;

                return (
                  <Link key={submission.id} href={href} className="bf-link-card">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="bf-eyebrow">{submission.form.slug}</p>
                        <h3 className="mt-3 text-[28px] font-extrabold leading-none">{submission.form.title}</h3>
                        <p className="mt-2 text-sm text-[var(--muted-strong)]">Updated {formatDateTime(submission.updatedAt)}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isDraft && (
                          <span className="bf-btn bf-btn-primary text-sm px-3 py-1">Resume draft</span>
                        )}
                        <StatusBadge status={submission.status} />
                      </div>
                    </div>

                    {submission.approvalTasks[0]?.note ? (
                      <div className="bf-panel-muted mt-4 px-4 py-3 text-sm leading-7 text-[var(--muted-strong)]">
                        Latest note: {submission.approvalTasks[0].note}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <aside className="bf-panel p-6">
          <div className="border-b border-[var(--line)] pb-4">
            <p className="bf-eyebrow">Published forms</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">Start something new</h2>
          </div>

          {visiblePublishedForms.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                eyebrow="No forms published"
                title="Nothing is open for submission"
                description="Ask an administrator to publish a form and attach a workflow."
              />
            </div>
          ) : (
            <div className="mt-5 bf-list">
              {visiblePublishedForms.map((form) => (
                <Link key={form.id} href={`/forms/${form.slug}`} className="bf-link-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{form.title}</h3>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">{form.slug}</p>
                    </div>
                    <StatusBadge status={form.sensitivity} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
