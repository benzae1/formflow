import { z } from "zod";

export const roleNameSchema = z
  .string()
  .trim()
  .min(1, "Role name is required.")
  .max(80, "Role name must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Role name must be a lowercase slug using letters, numbers, and hyphens.",
  );

export const roleLabelSchema = z
  .string()
  .trim()
  .min(1, "Role label is required.")
  .max(120, "Role label must be 120 characters or fewer.");

export const createRoleSchema = z.object({
  name: roleNameSchema,
  label: roleLabelSchema,
});

export const updateRoleSchema = z
  .object({
    name: roleNameSchema.optional(),
    label: roleLabelSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.label !== undefined,
    "Provide at least one field to update.",
  );
