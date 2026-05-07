import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import FormsManagerClient from "./FormsManagerClient";

export default async function AdminFormsPage() {
  await requirePageRole(["admin"]);

  const [forms, workflows, parentForms] = await Promise.all([
    db.form.findMany({
      include: {
        workflow: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.workflow.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.form.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: "asc",
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin forms"
        title="Form catalog"
        description="Create new intake experiences, attach workflows, and move forms from draft to published with the builder one click away."
      />
      <FormsManagerClient forms={forms as never} workflows={workflows} parentForms={parentForms} />
    </div>
  );
}
