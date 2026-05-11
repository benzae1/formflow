import Link from "next/link";
import { getTemporalClient } from "@/lib/temporal";
import { requirePageRole } from "@/lib/page-auth";
import { db } from "@/lib/db";

type Metric = { label: string; value: number | string; tone?: "default" | "success" | "warning" | "danger" };
type Section = { title: string; description: string; href: string; metrics: Metric[]; footnote?: string };

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
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function metricBorder(tone: Metric["tone"]) {
  switch (tone) {
    case "success": return "border-l-4 border-l-[var(--success)]";
    case "warning": return "border-l-4 border-l-[var(--warning)]";
    case "danger":  return "border-l-4 border-l-[var(--danger)]";
    default:        return "border-l-4 border-l-[var(--line-strong)]";
  }
}

function SectionCard({ section }: { section: Section }) {
  return (
    <Link
      href={section.href}
      className="block border border-[var(--line-strong)] bg-white p-6 hover:bg-[var(--canvas)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
            Admin section
          </p>
          <h2 className="mt-2 text-2xl font-bold">{section.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{section.description}</p>
        </div>
        <span className="shrink-0 border border-[var(--line-strong)] px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em]">
          Open →
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {section.metrics.map((metric) => (
          <div
            key={metric.label}
            className={`border border-[var(--line)] bg-[var(--canvas)] px-4 py-3 ${metricBorder(metric.tone)}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--muted)]">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      {section.footnote && (
        <p className="mt-4 text-xs text-[var(--muted)]">{section.footnote}</p>
      )}
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const user = await requirePageRole(["admin", "compliance"]);
  const now = new Date();

  const [
    formsDraft, formsPublished, formsArchived,
    submissionsSubmitted, submissionsInReview, submissionsNeedsRevision,
    submissionsApproved, submissionsRejected, submissionsClosed,
    overdueTasks, activeWorkflows, totalUsers, deactivatedUsers,
    latestSyncedUser, failedTemporalWorkflows,
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
    db.approvalTask.count({ where: { status: "pending", dueAt: { lt: now } } }),
    db.submission.count({ where: { workflowRunId: { not: null }, status: { in: ["submitted", "in_review", "needs_revision"] } } }),
    db.user.count(),
    db.user.count({ where: { deactivatedAt: { not: null } } }),
    db.user.findFirst({ where: { externalId: { not: null } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    getFailedTemporalWorkflowCount(),
  ]);

  const isComplianceOnly = user.roles.includes("compliance") && !user.roles.includes("admin");

  const sections: Section[] = [
    {
      title: "Forms",
      description: "Track publication state and move quickly into the builder.",
      href: "/admin/forms",
      metrics: [
        { label: "Drafts", value: formsDraft, tone: "warning" },
        { label: "Published", value: formsPublished, tone: "success" },
        { label: "Archived", value: formsArchived },
      ],
    },
    {
      title: "Submissions",
      description: "Monitor pipeline volume from newly submitted work through final outcomes.",
      href: "/admin/submissions",
      metrics: [
        { label: "Submitted", value: submissionsSubmitted, tone: "warning" },
        { label: "In review", value: submissionsInReview, tone: "warning" },
        { label: "Needs revision", value: submissionsNeedsRevision, tone: "warning" },
        { label: "Approved", value: submissionsApproved, tone: "success" },
        { label: "Rejected", value: submissionsRejected, tone: "danger" },
        { label: "Closed", value: submissionsClosed },
      ],
    },
    {
      title: "Workflow Health",
      description: "Watch execution pressure, SLA risk, and Temporal failures.",
      href: "/admin/workflows",
      metrics: [
        { label: "Active workflows", value: activeWorkflows, tone: "success" },
        { label: "Overdue tasks", value: overdueTasks, tone: overdueTasks > 0 ? "danger" : "default" },
        { label: "Failed Temporal", value: failedTemporalWorkflows === null ? "Unavailable" : failedTemporalWorkflows, tone: failedTemporalWorkflows ? "danger" : "default" },
      ],
      footnote: failedTemporalWorkflows === null ? "Temporal visibility currently unavailable." : undefined,
    },
    {
      title: "Org Sync",
      description: "Confirm directory freshness and inactive identity coverage.",
      href: "/admin/org",
      metrics: [
        { label: "Last sync", value: formatDateTime(latestSyncedUser?.updatedAt ?? null) },
        { label: "Users", value: totalUsers },
        { label: "Deactivated", value: deactivatedUsers, tone: deactivatedUsers > 0 ? "warning" : "default" },
      ],
    },
    {
      title: "Users",
      description: "Review who is in the system and spot lifecycle changes.",
      href: "/admin/users",
      metrics: [
        { label: "Total", value: totalUsers },
        { label: "Active", value: totalUsers - deactivatedUsers, tone: "success" },
        { label: "Deactivated", value: deactivatedUsers, tone: "warning" },
      ],
    },
    {
      title: "Audit Log",
      description: "Inspect sensitive access trails and compliance-significant events.",
      href: "/admin/audit-log",
      metrics: [
        { label: "Sensitive submissions", value: submissionsInReview + submissionsApproved + submissionsRejected + submissionsClosed },
        { label: "Overdue alerts", value: overdueTasks, tone: "danger" },
        { label: "Failed workflows", value: failedTemporalWorkflows === null ? "Unavailable" : failedTemporalWorkflows },
      ],
    },
  ];

  const visibleSections = isComplianceOnly
    ? sections.filter((s) => ["Submissions", "Audit Log", "Workflow Health"].includes(s.title))
    : sections;

  return (
    <div className="space-y-6">
      <header className="border border-[var(--line-strong)] bg-white px-8 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
          {isComplianceOnly ? "Compliance" : "Admin"} · Operations
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="text-4xl font-bold">
            {isComplianceOnly ? "Oversight Dashboard" : "Operations Dashboard"}
          </h1>
          {user.roles.includes("admin") && (
            <div className="flex gap-3">
              <Link href="/admin/forms" className="bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                Manage forms
              </Link>
              <Link href="/admin/workflows" className="border border-[var(--line-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)]">
                Review workflows
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleSections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </section>
    </div>
  );
}
