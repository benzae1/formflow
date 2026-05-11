import { decryptValue } from "./encryption";
import { FormioSchema, visitFormioComponents } from "./formio-schema";

type FieldAccessInput = {
  schema: FormioSchema;
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

function collectFieldRules(schema: FormioSchema) {
  const rules: Record<string, FieldRule> = {};
  visitFormioComponents(schema, (component) => {
    if (typeof component.key !== "string") {
      return;
    }

    const properties = component.properties;
    rules[component.key] = {
      roles: properties?.readRoles
        ? properties.readRoles.split(",").map((role) => role.trim()).filter(Boolean)
        : [],
      ownerCanRead: properties?.ownerCanRead !== "false",
    };
  });

  return rules;
}
