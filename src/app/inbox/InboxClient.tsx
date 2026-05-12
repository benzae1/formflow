"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
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
    <div className="bf-stack">
      <PageHeader
        eyebrow="Approver workspace"
        title="Approval inbox"
        description="Triage the queue, jump into case detail, and only commit a decision when you have the context you need."
      />

      <section className="flex flex-wrap gap-0">
        {tabs.map((tab) => {
          const params = new URLSearchParams(currentParams.toString());
          params.set("view", tab.id);
          const active = view === tab.id;

          return (
            <Link
              key={tab.id}
              href={`/inbox?${params.toString()}`}
              className={`bf-tab ${active ? "bf-tab-active" : ""}`}
              style={{ marginLeft: active ? 0 : -1 }}
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
          {tasks.map((task, index) => (
            <article key={task.id} className="bf-list-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="bf-eyebrow">{view === "completed" ? "Completed review" : "Approval task"}</p>
                  <h2 className="mt-3 text-[30px] font-extrabold leading-none">{task.submission.form.title}</h2>
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">Submission {task.submission.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PrimitiveMark
                    shape={index % 3 === 0 ? "square" : index % 3 === 1 ? "circle" : "triangle"}
                    color={index % 3 === 0 ? "var(--haus-red)" : index % 3 === 1 ? "var(--haus-teal)" : "var(--haus-yellow)"}
                  />
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="bf-panel-muted px-4 py-3">
                  <p className="bf-kicker">Created</p>
                  <p className="mt-2 text-sm">{formatDateTime(task.createdAt)}</p>
                </div>
                <div className="bf-panel-muted px-4 py-3">
                  <p className="bf-kicker">Due</p>
                  <p className="mt-2 text-sm">{formatDateTime(task.dueAt)}</p>
                </div>
              </div>

              <div className="mt-5">
                <Link href={`/submissions/${task.submissionId}`} className="bf-btn bf-btn-primary">
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
