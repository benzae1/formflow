import {
  collectFieldDescriptors,
  encryptSensitiveSubmissionData,
} from "./formio-data";
import { FormioSchema } from "./formio-schema";

export type { FormioSchema } from "./formio-schema";

export function getSensitiveFieldKeys(schema: FormioSchema): string[] {
  return collectFieldDescriptors(schema)
    .filter((field) => field.sensitive)
    .map((field) => field.key);
}

export { encryptSensitiveSubmissionData };
