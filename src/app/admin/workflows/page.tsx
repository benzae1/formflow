import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import WorkflowsManagerClient from "./WorkflowsManagerClient";

export default async function AdminWorkflowsPage() {
  await requirePageRole(["admin"]);

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
        eyebrow="Admin workflows"
        title="Routing definitions"
        description="Keep workflow logic readable in JSON for now, but make it navigable enough that operations teams can edit safely."
      />
      <WorkflowsManagerClient workflows={workflows as never} />
    </div>
  );
}
