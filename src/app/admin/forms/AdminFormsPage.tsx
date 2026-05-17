import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import FormsManagerClient from "./FormsManagerClient";

export default async function AdminFormsPage() {
  const dictionary = await getDictionary(defaultLocale);
  await requirePageRole(["admin"], defaultLocale);

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
        eyebrow={dictionary.adminForms.pageEyebrow}
        title={dictionary.adminForms.pageTitle}
        description={dictionary.adminForms.pageDescription}
      />
      <FormsManagerClient
        locale={defaultLocale}
        dictionary={dictionary}
        forms={forms as never}
        workflows={workflows}
        parentForms={parentForms}
      />
    </div>
  );
}
