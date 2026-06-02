import BuilderClient from "./BuilderClient";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isDraftTranslationAvailable } from "@/lib/form-translation-service";
import { sortRoles, toRoleResponse } from "@/lib/roles";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dictionary = await getDictionary(defaultLocale);
  await requirePageRole(["admin"], defaultLocale);

  const { id } = await params;

  const [form, workflows, rawRoles] = await Promise.all([
    db.form.findUnique({
      where: { id },
      include: {
        workflow: true,
        allowedRoles: {
          orderBy: {
            name: "asc",
          },
        },
      },
    }),
    db.workflow.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.role.findMany(),
  ]);
  const availableRoles = sortRoles(rawRoles).map((role) => toRoleResponse(role));

  if (!form) {
    return <div>{dictionary.common.notAvailable}</div>;
  }

  return (
    <BuilderClient
      locale={defaultLocale}
      dictionary={dictionary}
      translationAvailable={isDraftTranslationAvailable()}
      form={{
        ...form,
        schema: (form.schema ?? { components: [] }) as FormBuilderSchema,
      }}
      workflows={workflows}
      availableRoles={availableRoles}
    />
  );
}
