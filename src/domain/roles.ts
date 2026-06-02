export const BUILT_IN_ROLE_NAMES = [
  "admin",
  "submitter",
  "approver",
  "compliance",
] as const;

export type AppRole = (typeof BUILT_IN_ROLE_NAMES)[number];

export const ROLE_HIERARCHY: AppRole[] = [
  "submitter",
  "approver",
  "admin",
  "compliance",
];
