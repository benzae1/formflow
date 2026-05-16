import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/page-auth";
import {
  auditSubmissionAccess,
  getSubmissionSchema,
  getVisibleSubmissionById,
  presentSubmissionForUser,
} from "@/lib/submissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmissionActionPanel } from "@/components/submissions/SubmissionActionPanel";
import { SubmissionFormView } from "@/components/submissions/SubmissionFormView";
import { formatDateTime, getStatusLabel, summarizeWorkflow } from "@/lib/ui";
import { getLocaleContext } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";
import { resolveFormTitle } from "@/lib/form-translations";

export default async function LocalizedSubmissionDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const user = await requirePageUser(locale);

  const submission = await getVisibleSubmissionById({
    submissionId: id,
    user,
  });

  if (!submission) {
    notFound();
  }

  await auditSubmissionAccess({
    actorId: user.id,
    submissionId: submission.id,
    sensitivity: submission.form.sensitivity,
    reason: "submission.viewed",
  });

  const visibleSubmission = presentSubmissionForUser(
    {
      ...submission,
      form: {
        ...submission.form,
        schema: getSubmissionSchema({
          ...submission,
          form: {
            ...submission.form,
            schema: submission.form.schema as Record<string, unknown>,
          },
        }),
      },
      data: submission.data as Record<string, unknown>,
    },
    user,
  );

  const isOwner = submission.submittedById === user.id;
  const pendingTask = submission.approvalTasks.find(
    (task) => task.status === "pending" && task.assignedToId === user.id,
  );
  const canAct = user.roles.includes("admin") || user.roles.includes("approver");
  const workflowSummary = submission.workflowDefinition
    ? summarizeWorkflow(submission.workflowDefinition as never, locale)
    : submission.form.workflow
      ? summarizeWorkflow(submission.form.workflow.definition as never, locale)
      : [];

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow={dictionary.submissions.detailEyebrow}
        title={resolveFormTitle(submission.form, locale)}
        description={dictionary.submissions.detailDescription}
      >
        <StatusBadge status={submission.status} label={getStatusLabel(submission.status, locale)} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="bf-panel p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              [dictionary.submissions.formVersion, String(submission.formVersion)],
              [dictionary.submissions.submittedBy, submission.submittedBy.name ?? submission.submittedBy.email],
              [dictionary.submissions.created, formatDateTime(submission.createdAt, locale)],
              [dictionary.submissions.updated, formatDateTime(submission.updatedAt, locale)],
            ].map(([label, value]) => (
              <article key={label} className="bf-panel-muted px-4 py-4">
                <p className="bf-kicker">{label}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <p className="bf-eyebrow">{dictionary.submissions.submittedAnswers}</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">{dictionary.submissions.responseSnapshot}</h2>
            <div className="mt-4">
              <SubmissionFormView
                dictionary={dictionary}
                schema={getSubmissionSchema({
                  ...submission,
                  form: {
                    ...submission.form,
                    schema: submission.form.schema as Record<string, unknown>,
                  },
                })}
                data={visibleSubmission.data as Record<string, unknown>}
              />
            </div>
          </div>

          {submission.childSubmissions.length > 0 ? (
            <div className="mt-6">
              <p className="bf-eyebrow">{dictionary.submissions.followUpWork}</p>
              <div className="mt-3 bf-list">
                {submission.childSubmissions.map((child) => (
                  <Link key={child.id} href={localizePath(locale, `/submissions/${child.id}`)} className="bf-link-card">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{resolveFormTitle(child.form, locale)}</p>
                        <p className="text-sm text-[var(--muted-strong)]">
                          {dictionary.submissions.childSubmission} {child.id}
                        </p>
                      </div>
                      <StatusBadge status={child.status} label={getStatusLabel(child.status, locale)} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="bf-stack">
          <SubmissionActionPanel
            locale={locale}
            dictionary={dictionary}
            submissionId={submission.id}
            formSlug={submission.form.slug}
            status={submission.status}
            isOwner={isOwner}
            canAct={canAct}
            pendingTask={
              pendingTask
                ? {
                    id: pendingTask.id,
                    submissionId: pendingTask.submissionId,
                    status: pendingTask.status,
                    dueAt: pendingTask.dueAt,
                  }
                : null
            }
          />

          <section className="bf-panel p-6">
            <p className="bf-eyebrow">{dictionary.submissions.approvalTimeline}</p>
            <div className="mt-4 bf-list">
              {submission.approvalTasks.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted-strong)]">
                  {dictionary.submissions.noApprovalTasks}
                </p>
              ) : (
                submission.approvalTasks.map((task) => (
                  <article key={task.id} className="bf-panel-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="bf-kicker">{locale === "de" ? "Stufe" : "Stage"} {task.stageIndex + 1}</p>
                        <p className="mt-2 text-sm font-semibold">{task.assignedTo.name ?? task.assignedTo.email}</p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {dictionary.submissions.due} {formatDateTime(task.dueAt, locale)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} label={getStatusLabel(task.status, locale)} />
                    </div>
                    {task.note ? (
                      <p className="bf-panel mt-3 px-3 py-3 text-sm leading-7 text-[var(--muted-strong)]">
                        {task.note}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="bf-panel p-6">
            <p className="bf-eyebrow">{dictionary.submissions.workflowContext}</p>
            <div className="mt-4 bf-list">
              {workflowSummary.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted-strong)]">
                  {dictionary.submissions.noWorkflowSummary}
                </p>
              ) : (
                workflowSummary.map((stage) => (
                  <article key={stage.id} className="bf-panel-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{stage.name}</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                          {stage.description}
                        </p>
                      </div>
                      <StatusBadge status={stage.type} label={getStatusLabel(stage.type, locale)} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
