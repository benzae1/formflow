import { z } from "zod";
import { validateConditionExpression } from "@/lib/workflow-conditions";

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
  childFormId: z.string().uuid().optional(),
  conditions: z
    .array(
      z.object({
        expression: z.string().superRefine((expr, ctx) => {
          const err = validateConditionExpression(expr);
          if (err) ctx.addIssue({ code: "custom", message: err });
        }),
      }),
    )
    .optional(),
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
}).superRefine((stage, context) => {
  if ((stage.type === "approval" || stage.type === "notification") && !stage.assignTo) {
    context.addIssue({
      code: "custom",
      message: `${stage.type} stages require assignTo.`,
      path: ["assignTo"],
    });
  }

  if (stage.type === "condition" && (!stage.conditions || stage.conditions.length === 0)) {
    context.addIssue({
      code: "custom",
      message: "Condition stages require at least one expression.",
      path: ["conditions"],
    });
  }

  if (stage.type === "trigger-form" && !stage.childFormId) {
    context.addIssue({
      code: "custom",
      message: "Trigger-form stages require childFormId.",
      path: ["childFormId"],
    });
  }
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  definition: z.array(workflowStageSchema),
});
