import { z } from "zod";
import { validateFormioSchema } from "@/lib/formio-schema";

const formSchemaJson = z
  .custom<Record<string, unknown>>(
    (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    "Form schema must be an object.",
  )
  .superRefine((value, context) => {
    try {
      validateFormioSchema(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Form schema is invalid.",
      });
    }
  });

export const createFormSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  schema: formSchemaJson,
  sensitivity: z.enum(["standard", "pii", "sensitive"]).default("standard"),
  workflowId: z.string().uuid().optional().nullable(),
  parentFormId: z.string().uuid().optional().nullable(),
});

export const updateFormSchema = createFormSchema.partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});
