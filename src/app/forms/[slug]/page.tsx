import { db } from "@/lib/db";
import SubmitFormClient from "./SubmitFormClient";
import { requirePageUser } from "@/lib/page-auth";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";
import { filterSubmissionDataForUser } from "@/lib/field-access";
import { getSubmissionSchema } from "@/lib/submissions";
import type { RenderableFormSchema } from "@/components/form-renderer/FormRenderer";
import type { FormioSchema } from "@/lib/formio-sensitive-fields";

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submissionId?: string }>;
}) {
  const user = await requirePageUser();
  const { slug } = await params;
  const { submissionId } = await searchParams;

  const form = await db.form.findUnique({
    where: { slug },
  });

  if (!form || form.status !== "published") {
    return <div>Form not available.</div>;
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
      form={{
        ...form,
        schema: (
          existingSubmission
            ? getSubmissionSchema({
                ...existingSubmission,
                form: {
                  ...form,
                  schema: form.schema as Record<string, unknown>,
                },
              })
            : form.schema ?? { components: [] }
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
