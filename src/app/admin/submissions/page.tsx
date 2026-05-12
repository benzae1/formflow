import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/ui";

type SearchParams = Promise<{
  status?: string;
  sensitivity?: string;
  formId?: string;
  includeSensitive?: string;
}>;

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePageRole(["admin", "compliance"]);
  const filters = await searchParams;
  const includeSensitive = filters.includeSensitive === "true";

  const [forms, submissions] = await Promise.all([
    db.form.findMany({
      orderBy: {
        title: "asc",
      },
    }),
    db.submission.findMany({
      where: {
        ...(!includeSensitive && !filters.sensitivity
          ? {
              form: {
                sensitivity: "standard" as const,
              },
            }
          : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.formId ? { formId: filters.formId } : {}),
        ...(filters.sensitivity
          ? {
              form: {
                sensitivity: filters.sensitivity as never,
              },
            }
          : {}),
      },
      include: {
        form: true,
        submittedBy: true,
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
  ]);

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow="Global submissions"
        title="Submission console"
        description="A shared read surface for admin and compliance to inspect active and completed work across every published form, with PII and sensitive work opt-in for list views."
      />

      <form className="bf-filter-bar">
        <div className="bf-filter-group">
          <select name="status" defaultValue={filters.status ?? ""} className="bf-select">
            <option value="">All statuses</option>
            {["draft", "submitted", "in_review", "needs_revision", "approved", "rejected", "closed"].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select name="sensitivity" defaultValue={filters.sensitivity ?? ""} className="bf-select">
            <option value="">All sensitivity</option>
            <option value="standard">Standard</option>
            <option value="pii">PII</option>
            <option value="sensitive">Sensitive</option>
          </select>
          <select name="formId" defaultValue={filters.formId ?? ""} className="bf-select">
            <option value="">All forms</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </select>
          <label className="bf-checkbox-row">
            <input type="checkbox" name="includeSensitive" value="true" defaultChecked={includeSensitive} />
            <span>Include PII and sensitive</span>
          </label>
        </div>
        <button type="submit" className="bf-btn bf-btn-primary">
          Filter
        </button>
      </form>

      <section className="bf-list">
        {submissions.map((submission) => (
          <Link key={submission.id} href={`/submissions/${submission.id}`} className="bf-link-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="bf-eyebrow">{submission.form.slug}</p>
                <h2 className="mt-3 text-[30px] font-extrabold leading-none">{submission.form.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                  Submitter {submission.submittedBy.name ?? submission.submittedBy.email} | Updated{" "}
                  {formatDateTime(submission.updatedAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge status={submission.status} />
                <StatusBadge status={submission.form.sensitivity} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
