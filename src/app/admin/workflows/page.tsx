import { db } from "@/lib/db";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import WorkflowsManagerClient from "./WorkflowsManagerClient";

export default async function AdminWorkflowsPage({
  params,
}: {
  params?: Promise<{ lang?: string }>;
}) {
  const { locale } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  await requirePageRole(["admin"], locale);

  const [workflows, roles, forms] = await Promise.all([
    db.workflow.findMany({
      include: {
        forms: {
          select: { id: true, title: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.role.findMany({
      select: { name: true, label: true },
      orderBy: { name: "asc" },
    }),
    db.form.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={locale === "de" ? "Admin-Workflows" : "Admin workflows"}
        title={locale === "de" ? "Routing-Definitionen" : "Routing definitions"}
        description={
          locale === "de"
            ? "Gestalten Sie Genehmigungsstufen visuell – per Karte, Drag &amp; Drop und typenspezifischen Feldern."
            : "Build approval stages visually – with cards, drag-and-drop, and type-specific field editors."
        }
      />
      <WorkflowsManagerClient workflows={workflows as never} locale={locale} roles={roles} forms={forms} />
    </div>
  );
}
