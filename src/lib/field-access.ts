import { decryptValue } from "./encryption";

type FieldAccessInput = {
  schema: Record<string, unknown>;
  data: Record<string, unknown>;
  userRoles: string[];
  isOwner: boolean;
};

type FieldRule = {
  roles: string[];
  ownerCanRead: boolean;
};

export function filterSubmissionDataForUser(input: FieldAccessInput) {
  const result: Record<string, unknown> = {};

  const fieldRules = collectFieldRules(input.schema);

  for (const [key, value] of Object.entries(input.data)) {
    const rule = fieldRules[key];

    if (!rule) {
      result[key] = maybeDecrypt(value);
      continue;
    }

    if (input.isOwner && rule.ownerCanRead) {
      result[key] = maybeDecrypt(value);
      continue;
    }

    const hasRole = rule.roles.some((role) => input.userRoles.includes(role));

    if (hasRole) {
      result[key] = maybeDecrypt(value);
    } else {
      result[key] = null;
    }
  }

  return result;
}

function maybeDecrypt(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "__encrypted" in value &&
    (value as { __encrypted?: boolean }).__encrypted
  ) {
    return decryptValue(value as Parameters<typeof decryptValue>[0]);
  }

  return value;
}

function collectFieldRules(schema: Record<string, unknown>) {
  const rules: Record<string, FieldRule> = {};

  function walk(components?: Array<Record<string, unknown>>) {
    if (!components) return;

    for (const component of components) {
      if (typeof component.key === "string") {
        const properties =
          typeof component.properties === "object" && component.properties
            ? (component.properties as Record<string, string>)
            : undefined;

        rules[component.key] = {
          roles: properties?.readRoles
            ? properties.readRoles.split(",").map((role) => role.trim())
            : [],
          ownerCanRead: properties?.ownerCanRead !== "false",
        };
      }

      if (Array.isArray(component.components)) {
        walk(component.components as Array<Record<string, unknown>>);
      }

      if (Array.isArray(component.columns)) {
        for (const col of component.columns as Array<Record<string, unknown>>) {
          if (Array.isArray(col.components)) {
            walk(col.components as Array<Record<string, unknown>>);
          }
        }
      }
    }
  }

  walk(
    Array.isArray(schema.components)
      ? (schema.components as Array<Record<string, unknown>>)
      : undefined,
  );

  return rules;
}
