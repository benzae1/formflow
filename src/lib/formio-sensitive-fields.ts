import { encryptValue } from "@/lib/encryption";
import { FormioSchema, visitFormioComponents } from "./formio-schema";

export type { FormioSchema } from "./formio-schema";

export function getSensitiveFieldKeys(schema: FormioSchema): string[] {
  const keys: string[] = [];
  visitFormioComponents(schema, (component) => {
    if (component.key && component.properties?.sensitive === "true") {
      keys.push(component.key);
    }
  });

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
