import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import { formatDateTime, getStatusLabel, titleCaseStatus } from "@/lib/ui";
import { getLocaleContext } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";
import { resolveFormTitle } from "@/lib/form-translations";
import { canUserAccessForm } from "@/lib/form-access";

type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

export default async function LocalizedSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const user = await requirePageUser(locale);
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
        eyebrow={dictionary.submissions.submitterWorkspace}
        title={dictionary.submissions.mySubmissions}
        description={dictionary.submissions.submitterDescription}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {buckets.map((bucket, index) => (
          <article key={bucket} className="bf-metric-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bf-eyebrow">{titleCaseStatus(bucket, locale)}</p>
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
              <p className="bf-eyebrow">{dictionary.submissions.submissionList}</p>
              <h2 className="mt-3 text-[32px] font-extrabold leading-none">{dictionary.submissions.currentWork}</h2>
            </div>

            <form className="bf-filter-group">
              <input type="search" name="q" defaultValue={q} placeholder={dictionary.submissions.searchPlaceholder} className="bf-input" />
              <select name="status" defaultValue={status ?? ""} className="bf-select">
                <option value="">{dictionary.submissions.allStatuses}</option>
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {titleCaseStatus(bucket, locale)}
                  </option>
                ))}
              </select>
              <button type="submit" className="bf-btn bf-btn-primary">
                {dictionary.submissions.filter}
              </button>
            </form>
          </div>

          {submissions.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                eyebrow={dictionary.submissions.noMatchesEyebrow}
                title={dictionary.submissions.noMatchesTitle}
                description={dictionary.submissions.noMatchesDescription}
              />
            </div>
          ) : (
            <div className="mt-5 bf-list">
              {submissions.map((submission) => {
                const isDraft = submission.status === "draft";
                const href = isDraft
                  ? `${localizePath(locale, `/forms/${submission.form.slug}`)}?submissionId=${submission.id}`
                  : localizePath(locale, `/submissions/${submission.id}`);

                return (
                  <Link key={submission.id} href={href} className="bf-link-card">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="bf-eyebrow">{submission.form.slug}</p>
                        <h3 className="mt-3 text-[28px] font-extrabold leading-none">{resolveFormTitle(submission.form, locale)}</h3>
                        <p className="mt-2 text-sm text-[var(--muted-strong)]">
                          {dictionary.submissions.updated} {formatDateTime(submission.updatedAt, locale)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isDraft && (
                          <span className="bf-btn bf-btn-primary text-sm px-3 py-1">{dictionary.submissions.resumeDraft}</span>
                        )}
                        <StatusBadge status={submission.status} label={getStatusLabel(submission.status, locale)} />
                      </div>
                    </div>

                    {submission.approvalTasks[0]?.note ? (
                      <div className="bf-panel-muted mt-4 px-4 py-3 text-sm leading-7 text-[var(--muted-strong)]">
                        {dictionary.submissions.latestNote}: {submission.approvalTasks[0].note}
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
            <p className="bf-eyebrow">{dictionary.submissions.publishedForms}</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">{dictionary.submissions.startSomethingNew}</h2>
          </div>

          {visiblePublishedForms.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                eyebrow={dictionary.submissions.nothingPublishedEyebrow}
                title={dictionary.submissions.nothingPublishedTitle}
                description={dictionary.submissions.nothingPublishedDescription}
              />
            </div>
          ) : (
            <div className="mt-5 bf-list">
              {visiblePublishedForms.map((form) => (
                <Link key={form.id} href={localizePath(locale, `/forms/${form.slug}`)} className="bf-link-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{resolveFormTitle(form, locale)}</h3>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">{form.slug}</p>
                    </div>
                    <StatusBadge status={form.sensitivity} label={getStatusLabel(form.sensitivity, locale)} />
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
