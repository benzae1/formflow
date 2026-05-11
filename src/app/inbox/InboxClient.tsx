"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/ui";

type InboxTask = {
  id: string;
  submissionId: string;
  createdAt: string | Date;
  dueAt?: string | Date | null;
  status: string;
  submission: {
    id: string;
    form: {
      title: string;
    };
  };
};

const tabs = [
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
] as const;

export default function InboxClient({
  tasks,
  view,
}: {
  tasks: InboxTask[];
  view: string;
}) {
  const searchParams = useSearchParams();
  const currentParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Approver workspace"
        title="Approval inbox"
        description="Triage the queue, jump into case detail, and only commit a decision when you have the context you need."
      />

      <section className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const params = new URLSearchParams(currentParams.toString());
          params.set("view", tab.id);
          const active = view === tab.id;

          return (
            <Link
              key={tab.id}
              href={`/inbox?${params.toString()}`}
              className={`border px-4 py-2 text-sm font-semibold ${
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line-strong)] bg-white text-[var(--ink)] hover:bg-[var(--canvas)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </section>

      {tasks.length === 0 ? (
        <EmptyState
          eyebrow="Queue clear"
          title="No tasks in this view"
          description="New approval work will appear here as soon as workflow stages resolve to you."
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="border border-[var(--line-strong)] bg-white p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
                    {view === "completed" ? "Completed review" : "Approval task"}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold">
                    {task.submission.form.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Submission {task.submission.id}
                  </p>
                </div>
                <StatusBadge status={task.status} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border border-[var(--line)] bg-[var(--canvas)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--muted)]">
                    Created
                  </p>
                  <p className="mt-2 text-sm">{formatDateTime(task.createdAt)}</p>
                </div>
                <div className="border border-[var(--line)] bg-[var(--canvas)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--muted)]">
                    Due
                  </p>
                  <p className="mt-2 text-sm">{formatDateTime(task.dueAt)}</p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/submissions/${task.submissionId}`}
                  className="inline-flex bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Open submission
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
