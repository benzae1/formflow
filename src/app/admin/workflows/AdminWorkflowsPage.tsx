import { PageHeader } from "@/components/ui/PageHeader";
import { db } from "@/lib/db";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/page-auth";
import WorkflowsManagerClient from "./WorkflowsManagerClient";

export default async function AdminWorkflowsPage({
  params,
}: {
  params?: Promise<{ lang?: string }>;
}) {
  const { locale, dictionary } = await getLocaleContextOrDefault(
    params ? (await params).lang : undefined,
  );
  await requirePageRole(["admin"], locale);

  const [workflows, roles, forms, users] = await Promise.all([
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
    db.user.findMany({
      where: { deactivatedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        externalId: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dictionary.adminWorkflows.pageEyebrow}
        title={dictionary.adminWorkflows.pageTitle}
        description={dictionary.adminWorkflows.pageDescription}
      />
      <WorkflowsManagerClient
        workflows={workflows as never}
        roles={roles}
        forms={forms}
        users={users}
        dictionary={dictionary}
      />
    </div>
  );
}
