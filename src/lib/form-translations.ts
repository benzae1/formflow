import type { Locale } from "@/lib/i18n/config";
import type { FormioSchema } from "@/lib/formio-schema";

export type TranslationReviewStatus = "missing" | "needs_review" | "reviewed";

export type LocalizedFormContent = {
  title?: string;
  schema?: FormioSchema;
  reviewStatus?: TranslationReviewStatus;
  generatedAt?: string | null;
};

export type FormTranslations = Partial<Record<Locale, LocalizedFormContent>>;

export function parseFormTranslations(input: unknown): FormTranslations {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as FormTranslations;
}

export function getLocaleTranslation(
  input: unknown,
  locale: Locale,
) {
  const translations = parseFormTranslations(input);
  return translations[locale];
}

export function resolveFormTitle(
  form: { title: string; translations?: unknown },
  locale: Locale,
) {
  if (locale === "de") {
    return form.title;
  }

  return getLocaleTranslation(form.translations, locale)?.title?.trim() || form.title;
}

export function resolveFormSchema(
  form: { schema: unknown; translations?: unknown },
  locale: Locale,
) {
  if (locale === "de") {
    return form.schema as FormioSchema;
  }

  return (
    getLocaleTranslation(form.translations, locale)?.schema ??
    (form.schema as FormioSchema)
  );
}

export type SchemaTranslationEntry = {
  id: string;
  value: string;
};

const STRING_KEYS = [
  "label",
  "placeholder",
  "tooltip",
  "description",
  "legend",
  "content",
  "html",
  "title",
  "subtitle",
  "errorLabel",
  "prefix",
  "suffix",
  "customClass",
  "tabLabel",
  "modalTitle",
  "confirmCancel",
  "confirmSave",
  "confirmClose",
  "submitLabel",
  "addAnother",
  "saveRow",
  "removeRow",
  "defaultValue",
];

const NESTED_STRING_PATHS = [
  ["validate", "requiredMessage"],
  ["validate", "customMessage"],
  ["validate", "customPrivate"],
];

export function collectSchemaTranslationEntries(schema: FormioSchema) {
  const entries: SchemaTranslationEntry[] = [];

  visitNode(schema as Record<string, unknown>, [], entries);

  return entries.filter((entry) => entry.value.trim().length > 0);
}

export function applySchemaTranslations(
  schema: FormioSchema,
  translatedValues: Record<string, string>,
) {
  const nextSchema = structuredClone(schema) as Record<string, unknown>;

  for (const [id, value] of Object.entries(translatedValues)) {
    setValueAtPath(nextSchema, id.split("."), value);
  }

  return nextSchema as FormioSchema;
}

function visitNode(
  node: Record<string, unknown>,
  path: string[],
  entries: SchemaTranslationEntry[],
) {
  for (const key of STRING_KEYS) {
    const value = node[key];
    if (typeof value === "string" && value.trim().length > 0) {
      entries.push({ id: [...path, key].join("."), value });
    }
  }

  for (const nestedPath of NESTED_STRING_PATHS) {
    const value = getValueAtPath(node, nestedPath);
    if (typeof value === "string" && value.trim().length > 0) {
      entries.push({ id: [...path, ...nestedPath].join("."), value });
    }
  }

  const dataValues = getValueAtPath(node, ["data", "values"]);
  if (Array.isArray(dataValues)) {
    dataValues.forEach((item, index) => {
      if (item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string") {
        entries.push({
          id: [...path, "data", "values", String(index), "label"].join("."),
          value: String((item as { label: string }).label),
        });
      }
    });
  }

  for (const [key, value] of Object.entries(node)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          visitNode(item as Record<string, unknown>, [...path, key, String(index)], entries);
        }
      });
      continue;
    }

    visitNode(value as Record<string, unknown>, [...path, key], entries);
  }
}

function getValueAtPath(
  node: Record<string, unknown>,
  path: string[],
) {
  let current: unknown = node;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function setValueAtPath(
  node: Record<string, unknown>,
  path: string[],
  value: string,
) {
  let current: unknown = node;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];

    if (Array.isArray(current)) {
      current = current[Number(segment)];
      continue;
    }

    if (!current || typeof current !== "object") {
      return;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  const finalKey = path[path.length - 1];

  if (Array.isArray(current)) {
    current[Number(finalKey)] = value;
    return;
  }

  if (!current || typeof current !== "object") {
    return;
  }

  (current as Record<string, unknown>)[finalKey] = value;
}
