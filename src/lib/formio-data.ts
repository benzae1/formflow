import { decryptValue, encryptValue } from "@/lib/encryption";
import { FormioComponent, FormioSchema } from "./formio-schema";

type PathToken = string | "*";

type FieldDescriptor = {
  key: string;
  type: string;
  path: PathToken[];
  sensitive: boolean;
  readRoles: string[];
  ownerCanRead: boolean;
};

const OBJECT_FIELD_TYPES = new Set(["container", "selectboxes"]);
const ARRAY_FIELD_TYPES = new Set(["datagrid", "editgrid"]);
const STRING_FIELD_TYPES = new Set([
  "day",
  "email",
  "phoneNumber",
  "radio",
  "select",
  "textarea",
  "textfield",
]);

const NUMERIC_FIELD_TYPES = new Set(["number"]);
const BOOLEAN_FIELD_TYPES = new Set(["checkbox"]);
const LAYOUT_COMPONENT_TYPES = new Set([
  "columns",
  "content",
  "fieldset",
  "panel",
  "table",
  "well",
]);

export function collectFieldDescriptors(schema: FormioSchema): FieldDescriptor[] {
  const descriptors: FieldDescriptor[] = [];
  collectComponentDescriptors(schema.components, [], descriptors);
  return descriptors;
}

export function normalizeSubmissionData(
  schema: FormioSchema,
  input: Record<string, unknown>,
) {
  return validateObjectAgainstComponents(schema.components ?? [], input, []);
}

export function encryptSensitiveSubmissionData(
  schema: FormioSchema,
  data: Record<string, unknown>,
) {
  const result = structuredClone(data);

  for (const field of collectFieldDescriptors(schema)) {
    if (!field.sensitive) {
      continue;
    }

    transformAtPath(result, field.path, (value) => {
      if (value === undefined || value === null || isEncryptedValue(value)) {
        return value;
      }

      return encryptValue(value);
    });
  }

  return result;
}

export function decryptSubmissionData(data: Record<string, unknown>) {
  return deepMapValues(data, (value) => {
    if (isEncryptedValue(value)) {
      return decryptValue(value);
    }

    return value;
  }) as Record<string, unknown>;
}

export function filterSubmissionDataForUser(input: {
  schema: FormioSchema;
  data: Record<string, unknown>;
  userRoles: string[];
  isOwner: boolean;
}) {
  const result = decryptSubmissionData(structuredClone(input.data));

  for (const field of collectFieldDescriptors(input.schema)) {
    const canOwnerRead = input.isOwner && field.ownerCanRead;
    const canRoleRead =
      field.readRoles.length === 0 ||
      field.readRoles.some((role) => input.userRoles.includes(role));

    if (canOwnerRead || canRoleRead) {
      continue;
    }

    transformAtPath(result, field.path, () => null);
  }

  return result;
}

function collectComponentDescriptors(
  components: FormioComponent[] | undefined,
  basePath: PathToken[],
  descriptors: FieldDescriptor[],
) {
  if (!components) {
    return;
  }

  for (const component of components) {
    const type = component.type ?? "unknown";
    const key = typeof component.key === "string" ? component.key : undefined;

    if (key && shouldTreatAsField(component)) {
      descriptors.push({
        key,
        type,
        path: [...basePath, key],
        sensitive: component.properties?.sensitive === "true",
        readRoles: splitRoles(component.properties?.readRoles),
        ownerCanRead: component.properties?.ownerCanRead !== "false",
      });
    }

    const childBasePath = getChildBasePath(component, basePath);
    collectComponentDescriptors(component.components, childBasePath, descriptors);
    collectColumnDescriptors(component.columns, childBasePath, descriptors);
    collectRowDescriptors(component.rows, childBasePath, descriptors);

    if (Array.isArray(component.fieldSet)) {
      collectComponentDescriptors(component.fieldSet, childBasePath, descriptors);
    }

    if (component.editGrid?.components) {
      collectComponentDescriptors(component.editGrid.components, childBasePath, descriptors);
    }
  }
}

function collectColumnDescriptors(
  columns: Array<{ components?: FormioComponent[] }> | undefined,
  basePath: PathToken[],
  descriptors: FieldDescriptor[],
) {
  if (!Array.isArray(columns)) {
    return;
  }

  for (const column of columns) {
    collectComponentDescriptors(column.components, basePath, descriptors);
  }
}

function collectRowDescriptors(
  rows: Array<Array<{ components?: FormioComponent[] }>> | undefined,
  basePath: PathToken[],
  descriptors: FieldDescriptor[],
) {
  if (!Array.isArray(rows)) {
    return;
  }

  for (const row of rows) {
    for (const column of row ?? []) {
      collectComponentDescriptors(column.components, basePath, descriptors);
    }
  }
}

function validateObjectAgainstComponents(
  components: FormioComponent[],
  input: Record<string, unknown>,
  path: string[],
) {
  if (!isPlainObject(input)) {
    throw new Error(`Field "${formatPath(path)}" must be an object.`);
  }

  const result: Record<string, unknown> = {};
  const consumedKeys = new Set<string>();

  validateComponentsIntoResult(components, input, result, consumedKeys, path);

  for (const key of Object.keys(input)) {
    if (!consumedKeys.has(key)) {
      throw new Error(`Field "${formatPath([...path, key])}" is not defined in the form schema.`);
    }
  }

  return result;
}

function validateComponentsIntoResult(
  components: FormioComponent[],
  input: Record<string, unknown>,
  result: Record<string, unknown>,
  consumedKeys: Set<string>,
  path: string[],
) {
  for (const component of components) {
    validateComponentValue(component, input, result, consumedKeys, path);
  }
}

function validateComponentValue(
  component: FormioComponent,
  input: Record<string, unknown>,
  result: Record<string, unknown>,
  consumedKeys: Set<string>,
  path: string[],
) {
  const key = typeof component.key === "string" ? component.key : undefined;

  if (component.type === "button") {
    // Form.io records button state in submission data. Explicit button keys are
    // echoed back directly, and submit-action buttons also emit a synthetic
    // `submit: true` flag even when the schema omits a key.
    if (key) {
      consumedKeys.add(key);
    }
    if (component.action === "submit") {
      consumedKeys.add("submit");
    }
    return;
  }

  if (key && shouldTreatAsField(component)) {
    consumedKeys.add(key);
    const value = input[key];

    if (value !== undefined) {
      result[key] = normalizeValueForComponent(component, value, [...path, key]);
    }
  }

  const nestedComponents = getInlineNestedComponents(component);
  if (nestedComponents.length === 0 || shouldTreatAsField(component)) {
    return;
  }

  validateComponentsIntoResult(nestedComponents, input, result, consumedKeys, path);
}

function normalizeValueForComponent(
  component: FormioComponent,
  value: unknown,
  path: string[],
) {
  const type = component.type ?? "unknown";

  if (value === "") {
    return STRING_FIELD_TYPES.has(type) ? "" : null;
  }

  if (OBJECT_FIELD_TYPES.has(type)) {
    if (!isPlainObject(value)) {
      throw new Error(`Field "${formatPath(path)}" must be an object.`);
    }

    if (type === "container") {
      return validateObjectAgainstComponents(getNestedComponents(component), value, path);
    }

    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => {
        if (typeof entryValue === "boolean") {
          return [entryKey, entryValue];
        }

        throw new Error(`Field "${formatPath([...path, entryKey])}" must be true or false.`);
      }),
    );
  }

  if (ARRAY_FIELD_TYPES.has(type)) {
    if (!Array.isArray(value)) {
      throw new Error(`Field "${formatPath(path)}" must be a list.`);
    }

    return value.map((entry, index) => {
      if (!isPlainObject(entry)) {
        throw new Error(`Field "${formatPath([...path, String(index)])}" must be an object.`);
      }

      return validateObjectAgainstComponents(
        getNestedComponents(component),
        entry,
        [...path, String(index)],
      );
    });
  }

  if (BOOLEAN_FIELD_TYPES.has(type)) {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true" || value === "false") {
      return value === "true";
    }

    throw new Error(`Field "${formatPath(path)}" must be true or false.`);
  }

  if (NUMERIC_FIELD_TYPES.has(type)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }

    throw new Error(`Field "${formatPath(path)}" must be a valid number.`);
  }

  if (type === "select" && component.multiple) {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      throw new Error(`Field "${formatPath(path)}" must be a list of strings.`);
    }

    return value;
  }

  if (type === "day") {
    return normalizeDayValue(value, path);
  }

  if (type === "radio") {
    // Radio option values default to strings but Form.io allows numeric and
    // boolean values when the option dataType is set accordingly.
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    throw new Error(`Field "${formatPath(path)}" must be a string, number, or boolean.`);
  }

  if (STRING_FIELD_TYPES.has(type)) {
    if (typeof value === "string") {
      return value;
    }

    throw new Error(`Field "${formatPath(path)}" must be a string.`);
  }

  return value;
}

function getChildBasePath(component: FormioComponent, basePath: PathToken[]) {
  const key = typeof component.key === "string" ? component.key : undefined;
  const type = component.type ?? "unknown";

  if (!key) {
    return basePath;
  }

  if (type === "container") {
    return [...basePath, key];
  }

  if (ARRAY_FIELD_TYPES.has(type)) {
    return [...basePath, key, "*"];
  }

  return basePath;
}

function getNestedComponents(component: FormioComponent) {
  return [
    ...(component.components ?? []),
    ...(component.columns?.flatMap((column) => column.components ?? []) ?? []),
    ...(component.rows?.flatMap((row) => row.flatMap((column) => column.components ?? [])) ?? []),
    ...(component.fieldSet ?? []),
    ...(component.editGrid?.components ?? []),
  ];
}

function shouldTreatAsField(component: FormioComponent) {
  const type = component.type ?? "unknown";
  return Boolean(component.key) && type !== "button" && !LAYOUT_COMPONENT_TYPES.has(type);
}

function getInlineNestedComponents(component: FormioComponent) {
  return shouldTreatAsField(component) ? [] : getNestedComponents(component);
}

function splitRoles(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function transformAtPath(
  target: unknown,
  path: PathToken[],
  transform: (value: unknown) => unknown,
) {
  if (path.length === 0) {
    return;
  }

  const [segment, ...rest] = path;

  if (segment === "*") {
    if (!Array.isArray(target)) {
      return;
    }

    for (const entry of target) {
      transformAtPath(entry, rest, transform);
    }

    return;
  }

  if (!isPlainObject(target) || !(segment in target)) {
    return;
  }

  if (rest.length === 0) {
    target[segment] = transform(target[segment]);
    return;
  }

  transformAtPath(target[segment], rest, transform);
}

function deepMapValues(value: unknown, mapper: (value: unknown) => unknown): unknown {
  const mapped = mapper(value);

  if (mapped !== value) {
    return mapped;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepMapValues(entry, mapper));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepMapValues(entry, mapper)]),
    );
  }

  return value;
}

function normalizeDayValue(value: unknown, path: string[]) {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    throw new Error(`Field "${formatPath(path)}" must be a valid date value.`);
  }

  const allowedKeys = new Set(["day", "month", "year"]);
  const normalized = Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => {
      if (!allowedKeys.has(entryKey)) {
        throw new Error(
          `Field "${formatPath([...path, entryKey])}" is not defined in the form schema.`,
        );
      }

      if (
        entryValue === null ||
        entryValue === "" ||
        typeof entryValue === "string"
      ) {
        return [entryKey, entryValue];
      }

      if (typeof entryValue === "number" && Number.isFinite(entryValue)) {
        return [entryKey, String(entryValue)];
      }

      throw new Error(`Field "${formatPath([...path, entryKey])}" must be a string.`);
    }),
  );

  return normalized;
}

function isEncryptedValue(
  value: unknown,
): value is Parameters<typeof decryptValue>[0] {
  return Boolean(
    value &&
      typeof value === "object" &&
      "__encrypted" in value &&
      (value as { __encrypted?: boolean }).__encrypted,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatPath(path: string[]) {
  return path.length === 0 ? "submission" : path.join(".");
}
