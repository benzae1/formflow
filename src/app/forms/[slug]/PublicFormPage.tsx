import { db } from "@/lib/db";
import SubmitFormClient from "./SubmitFormClient";
import { requirePageUser } from "@/lib/page-auth";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";
import { filterSubmissionDataForUser } from "@/lib/formio-data";
import { getSubmissionSchema } from "@/lib/submissions";
import type { RenderableFormSchema } from "@/components/form-renderer/FormRenderer";
import type { FormioSchema } from "@/lib/formio-sensitive-fields";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveFormSchema, resolveFormTitle } from "@/lib/form-translations";

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submissionId?: string; preview?: string }>;
}) {
  const dictionary = await getDictionary(defaultLocale);
  const user = await requirePageUser(defaultLocale);
  const { slug } = await params;
  const { submissionId, preview } = await searchParams;
  const previewMode = preview === "1" || preview === "true";

  const form = await db.form.findUnique({
    where: { slug },
  });

  const canPreviewUnpublished = previewMode && user.roles.includes("admin");

  if (!form || (form.status !== "published" && !canPreviewUnpublished)) {
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
      locale={defaultLocale}
      dictionary={dictionary}
      form={{
        ...form,
        title: resolveFormTitle(form, defaultLocale),
        schema: (
          existingSubmission
            ? getSubmissionSchema({
                ...existingSubmission,
                form: {
                  ...form,
                  schema: form.schema as Record<string, unknown>,
                },
              })
            : resolveFormSchema(form, defaultLocale)
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
