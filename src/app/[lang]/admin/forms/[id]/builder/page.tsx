import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import BuilderClient from "@/app/admin/forms/[id]/builder/BuilderClient";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";
import { getLocaleContext } from "@/lib/i18n/server";
import { isDraftTranslationAvailable } from "@/lib/form-translation-service";
import { sortRoles, toRoleResponse } from "@/lib/roles";

export default async function LocalizedFormBuilderPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  await requirePageRole(["admin"], locale);

  const [form, workflows, rawRoles] = await Promise.all([
    db.form.findUnique({
      where: { id },
      include: {
        allowedRoles: {
          orderBy: {
            name: "asc",
          },
        },
      },
    }),
    db.workflow.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
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
      locale={locale}
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
