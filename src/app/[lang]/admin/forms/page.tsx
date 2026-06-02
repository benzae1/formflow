import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import FormsManagerClient from "@/app/admin/forms/FormsManagerClient";
import { getLocaleContext } from "@/lib/i18n/server";
import { sortRoles, toRoleResponse } from "@/lib/roles";

export default async function LocalizedAdminFormsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  await requirePageRole(["admin"], locale);

  const [forms, workflows, parentForms, rawRoles] = await Promise.all([
    db.form.findMany({
      include: {
        workflow: true,
        allowedRoles: {
          orderBy: {
            name: "asc",
          },
        },
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
    db.role.findMany(),
  ]);
  const availableRoles = sortRoles(rawRoles).map((role) => toRoleResponse(role));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dictionary.adminForms.pageEyebrow}
        title={dictionary.adminForms.pageTitle}
        description={dictionary.adminForms.pageDescription}
      />
      <FormsManagerClient
        locale={locale}
        dictionary={dictionary}
        forms={forms as never}
        workflows={workflows}
        parentForms={parentForms}
        availableRoles={availableRoles}
      />
    </div>
  );
}
