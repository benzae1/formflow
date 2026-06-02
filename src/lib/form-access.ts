type FormAccessRole = {
  name: string;
};

export function canUserAccessForm(
  userRoles: readonly string[],
  allowedRoles: readonly FormAccessRole[] | readonly string[] | null | undefined,
) {
  if (userRoles.includes("admin")) {
    return true;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const allowedRoleNames = allowedRoles.map((role) =>
    typeof role === "string" ? role : role.name,
  );

  return allowedRoleNames.some((roleName) => userRoles.includes(roleName));
}
