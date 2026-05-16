export type FormioProperties = {
  sensitive?: string;
  readRoles?: string;
  ownerCanRead?: string;
  [key: string]: string | undefined;
};

export type FormioComponent = {
  type?: string;
  key?: string;
  label?: string;
  action?: string;
  input?: boolean;
  html?: string;
  dataSrc?: string;
  multiple?: boolean;
  values?: Array<{ label?: string; value?: string | number | boolean }>;
  properties?: FormioProperties;
  components?: FormioComponent[];
  columns?: Array<{ components?: FormioComponent[] }>;
  rows?: Array<Array<{ components?: FormioComponent[] }>>;
  fieldSet?: FormioComponent[];
  editGrid?: { components?: FormioComponent[] };
  [key: string]: unknown;
};

export type FormioSchema = {
  display?: string;
  components?: FormioComponent[];
  [key: string]: unknown;
};

export type FormFieldSettings = {
  key: string;
  label: string;
  sensitive: boolean;
  readRoles: string[];
  ownerCanRead: boolean;
};

const SUPPORTED_COMPONENT_TYPES = new Set([
  "button",
  "checkbox",
  "columns",
  "container",
  "content",
  "datagrid",
  "day",
  "editgrid",
  "email",
  "fieldset",
  "number",
  "panel",
  "phoneNumber",
  "radio",
  "select",
  "selectboxes",
  "table",
  "textarea",
  "textfield",
  "well",
]);

const DANGEROUS_COMPONENT_KEYS = [
  "calculateValue",
  "customConditional",
  "customDefaultValue",
  "customValidation",
  "logic",
];

const UNSAFE_HTML_PATTERNS = [
  /<script\b/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
];

export function validateFormioSchema(schema: Record<string, unknown>) {
  if (!Array.isArray(schema.components)) {
    throw new Error("Form schema must include a components array.");
  }

  if (schema.display !== undefined && schema.display !== "form") {
    throw new Error('Form schema display must be "form".');
  }

  const seenKeys = new Set<string>();
  let submitButtons = 0;

  visitFormioComponents(schema as FormioSchema, (component) => {
    if (typeof component !== "object" || !component) {
      throw new Error("Each form component must be an object.");
    }

    const type = component.type;

    if (!type || !SUPPORTED_COMPONENT_TYPES.has(type)) {
      throw new Error(`Component type "${type ?? "unknown"}" is not supported.`);
    }

    if (component.key) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(component.key)) {
        throw new Error(
          `Component key "${component.key}" must start with a letter and contain only letters, numbers, or underscores.`,
        );
      }

      if (seenKeys.has(component.key)) {
        throw new Error(`Component key "${component.key}" is duplicated.`);
      }

      seenKeys.add(component.key);
    }

    for (const key of DANGEROUS_COMPONENT_KEYS) {
      if (hasMeaningfulDangerousValue(component[key])) {
        throw new Error(
          `Field "${component.key ?? component.label ?? "unknown"}" uses unsupported executable setting "${key}".`,
        );
      }
    }

    if (type === "content") {
      validateSafeHtml(
        component.html,
        component.key ?? component.label ?? "content",
      );
    }

    if (
      component.dataSrc !== undefined &&
      !["values", "json"].includes(component.dataSrc)
    ) {
      throw new Error(
        `Field "${component.key ?? component.label ?? "unknown"}" must use a local select data source.`,
      );
    }

    const properties = component.properties;
    if (properties) {
      const unsupportedProperty = Object.keys(properties).find(
        (key) => !["sensitive", "readRoles", "ownerCanRead"].includes(key),
      );

      if (unsupportedProperty) {
        throw new Error(
          `Field "${component.key ?? component.label ?? "unknown"}" uses unsupported custom property "${unsupportedProperty}".`,
        );
      }

      if (
        properties.sensitive !== undefined &&
        properties.sensitive !== "true" &&
        properties.sensitive !== "false"
      ) {
        throw new Error(
          `Field "${component.key ?? component.label ?? "unknown"}" has an invalid sensitive flag.`,
        );
      }

      if (
        properties.ownerCanRead !== undefined &&
        properties.ownerCanRead !== "true" &&
        properties.ownerCanRead !== "false"
      ) {
        throw new Error(
          `Field "${component.key ?? component.label ?? "unknown"}" has an invalid ownerCanRead flag.`,
        );
      }

      if (
        properties.readRoles !== undefined &&
        typeof properties.readRoles !== "string"
      ) {
        throw new Error(
          `Field "${component.key ?? component.label ?? "unknown"}" has an invalid readRoles value.`,
        );
      }
    }

    if (type === "button" && component.action === "submit") {
      submitButtons += 1;
    }
  });

  if (submitButtons === 0) {
    throw new Error("Form schema must include a submit button.");
  }
}

export function visitFormioComponents(
  schema: FormioSchema,
  visitor: (component: FormioComponent) => void,
) {
  walkComponents(schema.components, visitor);
}

export function collectFormFieldSettings(schema: FormioSchema) {
  const fields: FormFieldSettings[] = [];

  visitFormioComponents(schema, (component) => {
    if (!component.key || component.type === "button" || component.type === "content") {
      return;
    }

    fields.push({
      key: component.key,
      label: component.label ?? component.key,
      sensitive: component.properties?.sensitive === "true",
      readRoles: splitRoles(component.properties?.readRoles),
      ownerCanRead: component.properties?.ownerCanRead !== "false",
    });
  });

  return fields;
}

export function updateFormFieldSettings(
  schema: FormioSchema,
  key: string,
  nextSettings: Partial<FormFieldSettings>,
) {
  const nextSchema = structuredClone(schema);

  visitFormioComponents(nextSchema, (component) => {
    if (component.key !== key) {
      return;
    }

    const currentProperties = component.properties ?? {};
    const readRoles = nextSettings.readRoles
      ? nextSettings.readRoles.join(", ")
      : currentProperties.readRoles;
    const sensitive =
      nextSettings.sensitive !== undefined
        ? String(nextSettings.sensitive)
        : currentProperties.sensitive;
    const ownerCanRead =
      nextSettings.ownerCanRead !== undefined
        ? String(nextSettings.ownerCanRead)
        : currentProperties.ownerCanRead;

    component.properties = {
      ...currentProperties,
      sensitive,
      readRoles,
      ownerCanRead,
    };
  });

  return nextSchema;
}

function validateSafeHtml(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== "string") {
    throw new Error(`Content field "${fieldName}" must use a string HTML payload.`);
  }

  for (const pattern of UNSAFE_HTML_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error(`Content field "${fieldName}" contains unsupported HTML.`);
    }
  }
}

function hasMeaningfulDangerousValue(value: unknown) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
}

function walkComponents(
  components: FormioComponent[] | undefined,
  visitor: (component: FormioComponent) => void,
) {
  if (!components) {
    return;
  }

  for (const component of components) {
    visitor(component);
    walkComponents(component.components, visitor);
    walkColumns(component.columns, visitor);
    walkRows(component.rows, visitor);

    if (Array.isArray(component.fieldSet)) {
      walkComponents(component.fieldSet, visitor);
    }

    if (component.editGrid?.components) {
      walkComponents(component.editGrid.components, visitor);
    }
  }
}

function walkColumns(
  columns: Array<{ components?: FormioComponent[] }> | undefined,
  visitor: (component: FormioComponent) => void,
) {
  if (!columns) {
    return;
  }

  for (const column of columns) {
    walkComponents(column.components, visitor);
  }
}

function walkRows(
  rows: Array<Array<{ components?: FormioComponent[] }>> | undefined,
  visitor: (component: FormioComponent) => void,
) {
  if (!Array.isArray(rows)) {
    return;
  }

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const column of row) {
      walkComponents(column.components, visitor);
    }
  }
}

function splitRoles(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
