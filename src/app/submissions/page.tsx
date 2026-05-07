import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, titleCaseStatus } from "@/lib/ui";

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
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),
  ]);

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Submitter workspace"
        title="My submissions"
        description="Start a published form, track every decision point, and jump back into drafts or revision requests without losing context."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {buckets.map((bucket) => (
          <article
            key={bucket}
            className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] px-5 py-5 shadow-[var(--shadow-md)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              {titleCaseStatus(bucket)}
            </p>
            <p className="mt-3 text-3xl font-semibold">{counts[bucket]}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Submission list
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Current work</h2>
            </div>

            <form className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by form title"
                className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
              />
              <select
                name="status"
                defaultValue={status ?? ""}
                className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
              >
                <option value="">All statuses</option>
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {titleCaseStatus(bucket)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Filter
              </button>
            </form>
          </div>

          {submissions.length === 0 ? (
            <EmptyState
              eyebrow="Nothing here yet"
              title="No submissions match this view"
              description="Try a different filter or start a fresh request from one of the published forms on the right."
            />
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="flex flex-col gap-4 rounded-[24px] border border-black/10 bg-white/90 px-5 py-5 transition hover:-translate-y-0.5 hover:border-black/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                        {submission.form.slug}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold">
                        {submission.form.title}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Updated {formatDateTime(submission.updatedAt)}
                      </p>
                    </div>

                    <StatusBadge status={submission.status} />
                  </div>

                  {submission.approvalTasks[0]?.note ? (
                    <div className="rounded-2xl bg-[var(--canvas)] px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                      Latest note: {submission.approvalTasks[0].note}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Published forms
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Start something new</h2>
          </div>

          {publishedForms.length === 0 ? (
            <EmptyState
              eyebrow="No forms published"
              title="Nothing is open for submission"
              description="Ask an administrator to publish a form and attach a workflow."
            />
          ) : (
            <div className="space-y-3">
              {publishedForms.map((form) => (
                <Link
                  key={form.id}
                  href={`/forms/${form.slug}`}
                  className="block rounded-[22px] border border-black/10 bg-white/90 px-5 py-4 transition hover:border-black/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{form.title}</h3>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {form.slug}
                      </p>
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
