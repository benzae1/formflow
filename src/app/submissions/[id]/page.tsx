import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/page-auth";
import {
  auditSubmissionAccess,
  getVisibleSubmissionById,
  presentSubmissionForUser,
} from "@/lib/submissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmissionActionPanel } from "@/components/submissions/SubmissionActionPanel";
import { SubmissionFormView } from "@/components/submissions/SubmissionFormView";
import { formatDateTime, summarizeWorkflow } from "@/lib/ui";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;

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
        schema: submission.form.schema as Record<string, unknown>,
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
  const workflowSummary = submission.form.workflow
    ? summarizeWorkflow(submission.form.workflow.definition as never)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Submission detail"
        title={submission.form.title}
        description="A shared case file for submitters, approvers, administrators, and compliance reviewers."
      >
        <StatusBadge status={submission.status} />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-5 rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Form version", String(submission.formVersion)],
              ["Submitted by", submission.submittedBy.name ?? submission.submittedBy.email],
              ["Created", formatDateTime(submission.createdAt)],
              ["Updated", formatDateTime(submission.updatedAt)],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                  {label}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{value}</p>
              </article>
            ))}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Submitted answers
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Response snapshot</h2>
            <div className="mt-4">
              <SubmissionFormView
                schema={submission.form.schema as Record<string, unknown>}
                data={visibleSubmission.data as Record<string, unknown>}
              />
            </div>
          </div>

          {submission.childSubmissions.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Follow-up work
              </p>
              <div className="mt-3 space-y-3">
                {submission.childSubmissions.map((child) => (
                  <Link
                    key={child.id}
                    href={`/submissions/${child.id}`}
                    className="flex items-center justify-between rounded-[22px] border border-black/10 bg-white/90 px-4 py-4 transition hover:border-black/20"
                  >
                    <div>
                      <p className="text-sm font-semibold">{child.form.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Child submission {child.id}
                      </p>
                    </div>
                    <StatusBadge status={child.status} />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <SubmissionActionPanel
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

          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
              Approval timeline
            </p>
            <div className="mt-4 space-y-3">
              {submission.approvalTasks.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted)]">
                  No approval tasks have been created yet.
                </p>
              ) : (
                submission.approvalTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                          Stage {task.stageIndex + 1}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {task.assignedTo.name ?? task.assignedTo.email}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Due {formatDateTime(task.dueAt)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    {task.note ? (
                      <p className="mt-3 rounded-2xl bg-[var(--canvas)] px-3 py-3 text-sm leading-7 text-[var(--muted)]">
                        {task.note}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
              Workflow context
            </p>
            <div className="mt-4 space-y-3">
              {workflowSummary.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted)]">
                  No workflow summary is available for this form.
                </p>
              ) : (
                workflowSummary.map((stage) => (
                  <article
                    key={stage.id}
                    className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{stage.name}</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
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
