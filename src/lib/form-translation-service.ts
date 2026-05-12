import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { FormioSchema } from "@/lib/formio-schema";
import {
  applySchemaTranslations,
  collectSchemaTranslationEntries,
  type LocalizedFormContent,
} from "@/lib/form-translations";

export function isDraftTranslationAvailable() {
  return Boolean(process.env.DEEPL_API_KEY);
}

export async function generateDraftFormTranslation(input: {
  title: string;
  schema: FormioSchema;
  sourceLocale: Locale;
  targetLocale: Locale;
}) {
  if (!isDraftTranslationAvailable()) {
    throw new Error("Draft translation is not configured.");
  }

  const schemaEntries = collectSchemaTranslationEntries(input.schema);
  const translatedStrings = await translateTexts([
    input.title,
    ...schemaEntries.map((entry) => entry.value),
  ], input.sourceLocale, input.targetLocale);

  const [translatedTitle, ...translatedSchemaValues] = translatedStrings;
  const valueMap = Object.fromEntries(
    schemaEntries.map((entry, index) => [entry.id, translatedSchemaValues[index] ?? entry.value]),
  );

  return {
    title: translatedTitle ?? input.title,
    schema: applySchemaTranslations(input.schema, valueMap),
    reviewStatus: "needs_review",
    generatedAt: new Date().toISOString(),
  } satisfies LocalizedFormContent;
}

async function translateTexts(
  texts: string[],
  sourceLocale: Locale,
  targetLocale: Locale,
) {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DeepL is not configured.");
  }

  const body = new URLSearchParams();
  body.set("source_lang", sourceLocale === "de" ? "DE" : "EN");
  body.set("target_lang", targetLocale === "de" ? "DE" : "EN-US");

  for (const text of texts) {
    body.append("text", text);
  }

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DeepL request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    translations?: Array<{ text?: string }>;
  };

  return payload.translations?.map((translation) => translation.text ?? "") ?? [];
}
