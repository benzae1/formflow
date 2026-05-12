import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ApiError, apiErrorResponse } from "@/lib/errors";
import { generateDraftFormTranslation, isDraftTranslationAvailable } from "@/lib/form-translation-service";
import { parseFormTranslations } from "@/lib/form-translations";
import type { FormioSchema } from "@/lib/formio-schema";
import { requireRole } from "@/lib/permissions";
import { assertMutationRequest } from "@/lib/request-guard";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(req);
    const user = await requireRole(["admin"]);
    const { id } = await context.params;

    if (!isDraftTranslationAvailable()) {
      throw new ApiError(
        "TRANSLATION_UNAVAILABLE",
        "DeepL is not configured for draft translations.",
        409,
      );
    }

    const form = await db.form.findUnique({
      where: { id },
    });

    if (!form) {
      throw new ApiError("FORM_NOT_FOUND", "Form not found.", 404);
    }

    const englishDraft = await generateDraftFormTranslation({
      title: form.title,
      schema: form.schema as FormioSchema,
      sourceLocale: "de",
      targetLocale: "en",
    });

    const translations = parseFormTranslations(form.translations);
    const nextTranslations = {
      ...translations,
      en: englishDraft,
    };

    const updated = await db.form.update({
      where: { id },
      data: {
        translations: nextTranslations as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "form.translation_draft_generated",
      resourceType: "form",
      resourceId: form.id,
      beforeState: form,
      afterState: updated,
    });

    return Response.json({
      translation: englishDraft,
      form: updated,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
