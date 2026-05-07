import { z } from "zod";

const routingTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("role"),
    value: z.enum(["admin", "approver", "compliance"]),
  }),
  z.object({
    type: z.literal("org"),
    value: z.enum([
      "submitter.manager",
      "submitter.skip-level",
      "department.head",
    ]),
  }),
  z.object({
    type: z.literal("user"),
    value: z.string().uuid(),
  }),
  z.object({
    type: z.literal("group"),
    value: z.string().uuid(),
  }),
]);

export const workflowStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["approval", "notification", "trigger-form", "condition"]),
  assignTo: z.union([routingTargetSchema, z.array(routingTargetSchema)]).optional(),
  conditions: z.array(z.object({ expression: z.string() })).optional(),
  sla: z
    .object({
      hours: z.number().positive(),
      reminderAt: z.array(z.number().positive()),
    })
    .optional(),
  onApprove: z.union([z.literal("next-stage"), z.literal("close")]).optional(),
  onReject: z
    .union([
      z.literal("close"),
      z.literal("return-to-submitter"),
      z.object({ goTo: z.string() }),
    ])
    .optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  definition: z.array(workflowStageSchema),
});