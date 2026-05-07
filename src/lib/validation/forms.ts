import { z } from "zod";

export const createFormSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  schema: z.record(z.any()),
  sensitivity: z.enum(["standard", "pii", "sensitive"]).default("standard"),
  workflowId: z.string().uuid().optional().nullable(),
  parentFormId: z.string().uuid().optional().nullable(),
});

export const updateFormSchema = createFormSchema.partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});