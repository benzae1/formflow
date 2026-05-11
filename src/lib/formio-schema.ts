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

export function validateFormioSchema(schema: Record<string, unknown>) {
  if (!Array.isArray(schema.components)) {
    throw new Error("Form schema must include a components array.");
  }

  const seenKeys = new Set<string>();
  let submitButtons = 0;

  visitFormioComponents(schema as FormioSchema, (component) => {
    if (typeof component !== "object" || !component) {
      throw new Error("Each form component must be an object.");
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

    if (component.type === "button" && component.action === "submit") {
      submitButtons += 1;
    }

    const properties = component.properties;
    if (properties) {
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
    if (!component.key || component.type === "button") {
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
    .map((role) => role.trim())
    .filter(Boolean);
}
