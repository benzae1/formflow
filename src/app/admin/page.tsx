import Link from "next/link";
import { getTemporalClient } from "@/lib/temporal";
import { requirePageRole } from "@/lib/page-auth";
import { db } from "@/lib/db";

type Metric = {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger";
};

type Section = {
  title: string;
  description: string;
  href: string;
  metrics: Metric[];
  footnote?: string;
};

async function getFailedTemporalWorkflowCount() {
  try {
    const temporal = await getTemporalClient();
    const result = await temporal.workflow.count('ExecutionStatus = "Failed"');
    return result.count;
  } catch {
    return null;
  }
}

function formatDateTime(value: Date | null) {
  if (!value) return "No sync recorded";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function toneClasses(tone: Metric["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-950";
    default:
      return "border-black/10 bg-white text-black";
  }
}

function SectionCard({ section }: { section: Section }) {
  return (
    <Link
      href={section.href}
      className="group rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_18px_50px_rgba(36,24,10,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(36,24,10,0.12)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            Admin section
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
            {section.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">
            {section.description}
          </p>
        </div>

        <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-neutral-500 transition group-hover:border-black/20 group-hover:text-black">
          Open
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {section.metrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-2xl border px-4 py-4 ${toneClasses(metric.tone)}`}
          >
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {section.footnote ? (
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          {section.footnote}
        </p>
      ) : null}
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const user = await requirePageRole(["admin", "compliance"]);

  const now = new Date();

  const [
    formsDraft,
    formsPublished,
    formsArchived,
    submissionsSubmitted,
    submissionsInReview,
    submissionsNeedsRevision,
    submissionsApproved,
    submissionsRejected,
    submissionsClosed,
    overdueTasks,
    activeWorkflows,
    totalUsers,
    deactivatedUsers,
    latestSyncedUser,
    failedTemporalWorkflows,
  ] = await Promise.all([
    db.form.count({ where: { status: "draft" } }),
    db.form.count({ where: { status: "published" } }),
    db.form.count({ where: { status: "archived" } }),
    db.submission.count({ where: { status: "submitted" } }),
    db.submission.count({ where: { status: "in_review" } }),
    db.submission.count({ where: { status: "needs_revision" } }),
    db.submission.count({ where: { status: "approved" } }),
    db.submission.count({ where: { status: "rejected" } }),
    db.submission.count({ where: { status: "closed" } }),
    db.approvalTask.count({
      where: {
        status: "pending",
        dueAt: { lt: now },
      },
    }),
    db.submission.count({
      where: {
        workflowRunId: { not: null },
        status: {
          in: ["submitted", "in_review", "needs_revision"],
        },
      },
    }),
    db.user.count(),
    db.user.count({
      where: {
        deactivatedAt: { not: null },
      },
    }),
    db.user.findFirst({
      where: {
        externalId: { not: null },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        updatedAt: true,
      },
    }),
    getFailedTemporalWorkflowCount(),
  ]);

  const sections: Section[] = [
    {
      title: "Forms",
      description:
        "Track publication state and move quickly into the builder when definitions need attention.",
      href: "/admin/forms",
      metrics: [
        { label: "Drafts", value: formsDraft, tone: "warning" },
        { label: "Published", value: formsPublished, tone: "success" },
        { label: "Archived", value: formsArchived },
      ],
    },
    {
      title: "Submissions",
      description:
        "Monitor pipeline volume from newly submitted work through final outcomes.",
      href: "/admin/submissions",
      metrics: [
        { label: "Submitted", value: submissionsSubmitted, tone: "warning" },
        { label: "In review", value: submissionsInReview, tone: "warning" },
        {
          label: "Needs revision",
          value: submissionsNeedsRevision,
          tone: "warning",
        },
        { label: "Approved", value: submissionsApproved, tone: "success" },
        { label: "Rejected", value: submissionsRejected, tone: "danger" },
        { label: "Closed", value: submissionsClosed },
      ],
    },
    {
      title: "Workflow Health",
      description:
        "Watch execution pressure, SLA risk, and Temporal failures in one operational snapshot.",
      href: "/admin/workflows",
      metrics: [
        { label: "Active workflows", value: activeWorkflows, tone: "success" },
        { label: "Overdue tasks", value: overdueTasks, tone: "danger" },
        {
          label: "Failed Temporal workflows",
          value:
            failedTemporalWorkflows === null
              ? "Unavailable"
              : failedTemporalWorkflows,
          tone: failedTemporalWorkflows ? "danger" : "default",
        },
      ],
      footnote:
        failedTemporalWorkflows === null
          ? "Temporal visibility is currently unavailable, so failure counts could not be loaded."
          : undefined,
    },
    {
      title: "Org Sync",
      description:
        "Confirm directory freshness and make sure inactive identities are being reflected correctly.",
      href: "/admin/org",
      metrics: [
        { label: "Last sync time", value: formatDateTime(latestSyncedUser?.updatedAt ?? null) },
        { label: "Users", value: totalUsers },
        { label: "Deactivated users", value: deactivatedUsers, tone: "warning" },
      ],
      footnote:
        "Last sync time is derived from the most recently updated synced user record until dedicated sync telemetry is added.",
    },
    {
      title: "Users",
      description:
        "Review who is in the system and spot lifecycle changes that affect routing and access.",
      href: "/admin/users",
      metrics: [
        { label: "Total users", value: totalUsers },
        { label: "Active users", value: totalUsers - deactivatedUsers, tone: "success" },
        { label: "Deactivated", value: deactivatedUsers, tone: "warning" },
      ],
    },
    {
      title: "Audit Log",
      description:
        "Inspect sensitive access trails and compliance-significant system actions.",
      href: "/admin/audit-log",
      metrics: [
        { label: "Sensitive submissions", value: submissionsNeedsRevision + submissionsInReview + submissionsApproved + submissionsRejected + submissionsClosed },
        { label: "Overdue alerts", value: overdueTasks, tone: "danger" },
        { label: "Failed workflow count", value: failedTemporalWorkflows === null ? "Unavailable" : failedTemporalWorkflows },
      ],
    },
  ];

  const visibleSections = user.roles.includes("compliance") && !user.roles.includes("admin")
    ? sections.filter((section) => ["Submissions", "Audit Log", "Workflow Health"].includes(section.title))
    : sections;

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <header className="rounded-[32px] border border-black/10 bg-white/75 p-8 shadow-[0_30px_80px_rgba(34,24,8,0.10)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.38em] text-neutral-500">
            {user.roles.includes("compliance") && !user.roles.includes("admin")
              ? "FormFlow compliance"
              : "FormFlow admin"}
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                {user.roles.includes("compliance") && !user.roles.includes("admin")
                  ? "Oversight Dashboard"
                  : "Operations Dashboard"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                A single control surface for form publication, submission flow,
                workflow reliability, and organization sync health.
              </p>
            </div>

            {user.roles.includes("admin") ? (
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href="/admin/forms"
                  className="rounded-full bg-black px-5 py-2.5 font-medium text-white transition hover:bg-neutral-800"
                >
                  Manage forms
                </Link>
                <Link
                  href="/admin/workflows"
                  className="rounded-full border border-black/15 bg-white px-5 py-2.5 font-medium text-black transition hover:bg-neutral-50"
                >
                  Review workflows
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-2">
          {visibleSections.map((section) => (
            <SectionCard key={section.title} section={section} />
          ))}
        </section>
      </div>
    </div>
  );
}
