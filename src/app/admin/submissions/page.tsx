import Link from "next/link";
import { db } from "@/lib/db";
import { resolveFormTitle } from "@/lib/form-translations";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, getStatusLabel } from "@/lib/ui";

type SearchParams = Promise<{
  status?: string;
  sensitivity?: string;
  formId?: string;
  includeSensitive?: string;
}>;

export default async function AdminSubmissionsPage({
  searchParams,
  params,
}: {
  searchParams: SearchParams;
  params?: Promise<{ lang?: string }>;
}) {
  const { locale } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  await requirePageRole(["admin", "compliance"], locale);
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
        eyebrow={locale === "de" ? "Globale Einreichungen" : "Global submissions"}
        title={locale === "de" ? "Einreichungskonsole" : "Submission console"}
        description={
          locale === "de"
            ? "Eine gemeinsame Lesefläche für Administration und Compliance, um aktive und abgeschlossene Arbeit über alle veröffentlichten Formulare hinweg zu prüfen, mit optionaler Anzeige sensibler Inhalte."
            : "A shared read surface for admin and compliance to inspect active and completed work across every published form, with PII and sensitive work opt-in for list views."
        }
      />

      <form className="bf-filter-bar">
        <div className="bf-filter-group">
          <select name="status" defaultValue={filters.status ?? ""} className="bf-select">
            <option value="">{locale === "de" ? "Alle Status" : "All statuses"}</option>
            {["draft", "submitted", "in_review", "needs_revision", "approved", "rejected", "closed"].map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status, locale)}
              </option>
            ))}
          </select>
          <select name="sensitivity" defaultValue={filters.sensitivity ?? ""} className="bf-select">
            <option value="">{locale === "de" ? "Alle Sensitivitäten" : "All sensitivity"}</option>
            <option value="standard">{getStatusLabel("standard", locale)}</option>
            <option value="pii">{getStatusLabel("pii", locale)}</option>
            <option value="sensitive">{getStatusLabel("sensitive", locale)}</option>
          </select>
          <select name="formId" defaultValue={filters.formId ?? ""} className="bf-select">
            <option value="">{locale === "de" ? "Alle Formulare" : "All forms"}</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {resolveFormTitle(form, locale)}
              </option>
            ))}
          </select>
          <label className="bf-checkbox-row">
            <input type="checkbox" name="includeSensitive" value="true" defaultChecked={includeSensitive} />
            <span>{locale === "de" ? "PII und sensible Inhalte einbeziehen" : "Include PII and sensitive"}</span>
          </label>
        </div>
        <button type="submit" className="bf-btn bf-btn-primary">
          {locale === "de" ? "Filtern" : "Filter"}
        </button>
      </form>

      <section className="bf-list">
        {submissions.map((submission) => (
          <Link key={submission.id} href={localizePath(locale, `/submissions/${submission.id}`)} className="bf-link-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="bf-eyebrow">{submission.form.slug}</p>
                <h2 className="mt-3 text-[30px] font-extrabold leading-none">{resolveFormTitle(submission.form, locale)}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                  {locale === "de" ? "Einreichende" : "Submitter"} {submission.submittedBy.name ?? submission.submittedBy.email} |{" "}
                  {locale === "de" ? "Aktualisiert" : "Updated"} {formatDateTime(submission.updatedAt, locale)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge status={submission.status} label={getStatusLabel(submission.status, locale)} />
                <StatusBadge
                  status={submission.form.sensitivity}
                  label={getStatusLabel(submission.form.sensitivity, locale)}
                />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
