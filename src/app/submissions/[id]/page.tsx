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
import { BreakGlassGate } from "@/components/submissions/BreakGlassGate";
import { formatDateTime, summarizeWorkflow } from "@/lib/ui";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const dictionary = await getDictionary(defaultLocale);
  const user = await requirePageUser(defaultLocale);
  const { id } = await params;
  const { reason } = await searchParams;

  const submission = await getVisibleSubmissionById({
    submissionId: id,
    user,
  });

  if (!submission) {
    notFound();
  }

  const needsBreakGlass =
    submission.form.sensitivity === "sensitive" &&
    (!reason || reason.trim().length < 10);

  if (needsBreakGlass) {
    return (
      <BreakGlassGate
        action={`/submissions/${id}`}
        backHref="/submissions"
        dictionary={dictionary}
      />
    );
  }

  await auditSubmissionAccess({
    actorId: user.id,
    submissionId: submission.id,
    sensitivity: submission.form.sensitivity,
    reason: reason?.trim() ?? "submission.viewed",
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
    ? summarizeWorkflow(submission.workflowDefinition as never)
    : submission.form.workflow
      ? summarizeWorkflow(submission.form.workflow.definition as never)
    : [];

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow="Submission detail"
        title={submission.form.title}
        description="A shared case file for submitters, approvers, administrators, and compliance reviewers."
      >
        <StatusBadge status={submission.status} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="bf-panel p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Form version", String(submission.formVersion)],
              ["Submitted by", submission.submittedBy.name ?? submission.submittedBy.email],
              ["Created", formatDateTime(submission.createdAt)],
              ["Updated", formatDateTime(submission.updatedAt)],
            ].map(([label, value]) => (
              <article key={label} className="bf-panel-muted px-4 py-4">
                <p className="bf-kicker">{label}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <p className="bf-eyebrow">Submitted answers</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">Response snapshot</h2>
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
              <p className="bf-eyebrow">Follow-up work</p>
              <div className="mt-3 bf-list">
                {submission.childSubmissions.map((child) => (
                  <Link key={child.id} href={`/submissions/${child.id}`} className="bf-link-card">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{child.form.title}</p>
                        <p className="text-sm text-[var(--muted-strong)]">Child submission {child.id}</p>
                      </div>
                      <StatusBadge status={child.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="bf-stack">
          <SubmissionActionPanel
            locale={defaultLocale}
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
            <p className="bf-eyebrow">Approval timeline</p>
            <div className="mt-4 bf-list">
              {submission.approvalTasks.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted-strong)]">
                  No approval tasks have been created yet.
                </p>
              ) : (
                submission.approvalTasks.map((task) => (
                  <article key={task.id} className="bf-panel-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="bf-kicker">Stage {task.stageIndex + 1}</p>
                        <p className="mt-2 text-sm font-semibold">{task.assignedTo.name ?? task.assignedTo.email}</p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          Due {formatDateTime(task.dueAt)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
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
            <p className="bf-eyebrow">Workflow context</p>
            <div className="mt-4 bf-list">
              {workflowSummary.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted-strong)]">
                  No workflow summary is available for this form.
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
                      <StatusBadge status={stage.type} />
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
