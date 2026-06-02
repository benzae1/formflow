import { db } from "@/lib/db";
import SubmitFormClient from "@/app/forms/[slug]/SubmitFormClient";
import { requirePageUser } from "@/lib/page-auth";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";
import { filterSubmissionDataForUser } from "@/lib/formio-data";
import { getSubmissionSchema } from "@/lib/submissions";
import type { RenderableFormSchema } from "@/components/form-renderer/FormRenderer";
import type { FormioSchema } from "@/lib/formio-sensitive-fields";
import { resolveFormSchema, resolveFormTitle } from "@/lib/form-translations";
import { getLocaleContext } from "@/lib/i18n/server";
import { canUserAccessForm } from "@/lib/form-access";

export default async function LocalizedPublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ submissionId?: string; preview?: string }>;
}) {
  const { lang, slug } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const user = await requirePageUser(locale);
  const { submissionId, preview } = await searchParams;
  const previewMode = preview === "1" || preview === "true";

  const form = await db.form.findUnique({
    where: { slug },
    include: {
      allowedRoles: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  const canPreviewUnpublished = previewMode && user.roles.includes("admin");
  const canAccessForm = form ? canUserAccessForm(user.roles, form.allowedRoles) : false;

  if (
    !form ||
    (form.status !== "published" && !canPreviewUnpublished) ||
    (!canPreviewUnpublished && !canAccessForm)
  ) {
    return <div>{dictionary.forms.formNotAvailable}</div>;
  }

  const existingSubmission = submissionId
    ? await db.submission.findFirst({
        where: {
          id: submissionId,
          formId: form.id,
          ...submissionVisibilityWhere(user),
        },
        include: {
          form: true,
        },
      })
    : null;

  return (
    <SubmitFormClient
      locale={locale}
      dictionary={dictionary}
      form={{
        ...form,
        title: resolveFormTitle(form, locale),
        schema: (
          existingSubmission
            ? getSubmissionSchema({
                ...existingSubmission,
                form: {
                  ...form,
                  schema: form.schema as Record<string, unknown>,
                },
              })
            : resolveFormSchema(form, locale)
        ) as RenderableFormSchema,
      }}
      submissionId={existingSubmission?.id}
      initialData={
        existingSubmission
          ? filterSubmissionDataForUser({
              schema: getSubmissionSchema({
                ...existingSubmission,
                form: {
                  ...form,
                  schema: form.schema as Record<string, unknown>,
                },
              }) as FormioSchema,
              data: existingSubmission.data as Record<string, unknown>,
              userRoles: user.roles,
              isOwner: existingSubmission.submittedById === user.id,
            })
          : undefined
      }
      existingStatus={existingSubmission?.status}
    />
  );
}
