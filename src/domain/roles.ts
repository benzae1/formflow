export type AppRole = "admin" | "submitter" | "approver" | "compliance";

export const ROLE_HIERARCHY: AppRole[] = [
  "submitter",
  "approver",
  "admin",
  "compliance",
];