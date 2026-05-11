import { z } from "zod";

const appRoleSchema = z.enum(["admin", "submitter", "approver", "compliance"]);

export const updateUserRolesSchema = z.object({
  roles: z.array(appRoleSchema).min(1, "Select at least one role."),
});

export const createDelegationSchema = z
  .object({
    approverId: z.string().uuid().optional(),
    delegateId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .superRefine((value, ctx) => {
    if (value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Delegation end must be after the start time.",
      });
    }
  });
