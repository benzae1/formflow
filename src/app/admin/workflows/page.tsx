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

  const workflows = await db.workflow.findMany({
    include: {
      forms: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={locale === "de" ? "Admin-Workflows" : "Admin workflows"}
        title={locale === "de" ? "Routing-Definitionen" : "Routing definitions"}
        description={
          locale === "de"
            ? "Halten Sie Workflow-Logik vorerst in JSON lesbar, aber so navigierbar, dass operative Teams sie sicher bearbeiten können."
            : "Keep workflow logic readable in JSON for now, but make it navigable enough that operations teams can edit safely."
        }
      />
      <WorkflowsManagerClient workflows={workflows as never} locale={locale} />
    </div>
  );
}
