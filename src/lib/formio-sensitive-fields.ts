import { encryptValue } from "@/lib/encryption";

type FormioComponent = {
  key?: string;
  properties?: {
    sensitive?: string;
    readRoles?: string;
    ownerCanRead?: string;
    [key: string]: string | undefined;
  };
  components?: FormioComponent[];
  columns?: Array<{
    components?: FormioComponent[];
  }>;
  [key: string]: unknown;
};

export type FormioSchema = {
  components?: FormioComponent[];
  [key: string]: unknown;
};

export function getSensitiveFieldKeys(schema: FormioSchema): string[] {
  const keys: string[] = [];

  function walk(components?: FormioComponent[]) {
    if (!components) return;

    for (const component of components) {
      if (component.key && component.properties?.sensitive === "true") {
        keys.push(component.key);
      }

      if (component.components) {
        walk(component.components);
      }

      if (component.columns) {
        for (const column of component.columns) {
          walk(column.components);
        }
      }
    }
  }

  walk(schema.components);

  return keys;
}

export function encryptSensitiveSubmissionData(
  schema: FormioSchema,
  data: Record<string, unknown>,
) {
  const sensitiveKeys = getSensitiveFieldKeys(schema);
  const encrypted = { ...data };

  for (const key of sensitiveKeys) {
    if (key in encrypted) {
      encrypted[key] = encryptValue(encrypted[key]);
    }
  }

  return encrypted;
}
