import { z } from "zod";

export const createSubmissionSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.string(), z.any()),
  saveAsDraft: z.boolean().default(false),
  parentSubmissionId: z.string().uuid().optional().nullable(),
});

export const updateSubmissionSchema = z.object({
  data: z.record(z.string(), z.any()),
  submit: z.boolean().optional(),
});

export const decisionSchema = z.object({
  taskId: z.string().uuid(),
  note: z.string().optional(),
});
