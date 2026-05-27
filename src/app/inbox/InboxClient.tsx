"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/routing";
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

export default function InboxClient(props: {
  tasks: InboxTask[];
  view: string;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const { tasks, view, locale, dictionary } = props;
  const copy = dictionary.inbox;
  const searchParams = useSearchParams();
  const currentParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const tabs = [
    { id: "pending", label: copy.pending },
    { id: "overdue", label: copy.overdue },
    { id: "completed", label: copy.completed },
  ] as const;

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="flex flex-wrap gap-0">
        {tabs.map((tab) => {
          const params = new URLSearchParams(currentParams.toString());
          params.set("view", tab.id);
          const active = view === tab.id;

          return (
            <Link
              key={tab.id}
              href={`${localizePath(locale, "/inbox")}?${params.toString()}`}
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
          eyebrow={copy.emptyEyebrow}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task, index) => (
            <article key={task.id} className="bf-list-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="bf-eyebrow">
                    {view === "completed" ? copy.completedReview : copy.approvalTask}
                  </p>
                  <h2 className="mt-3 text-[30px] font-extrabold leading-none">
                    {task.submission.form.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">
                    {copy.submission} {task.submission.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PrimitiveMark
                    shape={
                      index % 3 === 0 ? "square" : index % 3 === 1 ? "circle" : "triangle"
                    }
                    color={
                      index % 3 === 0
                        ? "var(--haus-red)"
                        : index % 3 === 1
                          ? "var(--haus-teal)"
                          : "var(--haus-yellow)"
                    }
                  />
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="bf-panel-muted px-4 py-3">
                  <p className="bf-kicker">{copy.created}</p>
                  <p className="mt-2 text-sm">{formatDateTime(task.createdAt, locale)}</p>
                </div>
                <div className="bf-panel-muted px-4 py-3">
                  <p className="bf-kicker">{copy.due}</p>
                  <p className="mt-2 text-sm">{formatDateTime(task.dueAt, locale)}</p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={localizePath(locale, `/submissions/${task.submissionId}`)}
                  className="bf-btn bf-btn-primary"
                >
                  {copy.openSubmission}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
