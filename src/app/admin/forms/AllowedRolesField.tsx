"use client";

type RoleOption = {
  id: string;
  name: string;
  label: string | null;
};

export function AllowedRolesField({
  roles,
  selectedRoleNames,
  onToggleRole,
  title,
  description,
  allUsersLabel,
  noRolesLabel,
}: {
  roles: RoleOption[];
  selectedRoleNames: string[];
  onToggleRole: (roleName: string) => void;
  title: string;
  description: string;
  allUsersLabel: string;
  noRolesLabel: string;
}) {
  return (
    <div className="bf-panel-muted p-4">
      <div className="flex flex-col gap-2 border-b border-[var(--line)] pb-3">
        <p className="bf-kicker">{title}</p>
        <p className="text-sm text-[var(--muted-strong)]">{description}</p>
        <p className="text-sm font-semibold text-[var(--ink)]">
          {selectedRoleNames.length === 0
            ? allUsersLabel
            : roles
                .filter((role) => selectedRoleNames.includes(role.name))
                .map(getRoleDisplayName)
                .join(", ")}
        </p>
      </div>

      {roles.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted-strong)]">{noRolesLabel}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white px-3 py-3"
            >
              <input
                type="checkbox"
                checked={selectedRoleNames.includes(role.name)}
                onChange={() => onToggleRole(role.name)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block font-medium text-[var(--ink)]">
                  {getRoleDisplayName(role)}
                </span>
                <span className="block text-xs text-[var(--muted-strong)]">{role.name}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function getRoleDisplayName(role: Pick<RoleOption, "name" | "label">) {
  return role.label?.trim() || role.name;
}

export function getAllowedRolesSummary(
  roles: Array<Pick<RoleOption, "name" | "label">>,
  allUsersLabel: string,
) {
  if (roles.length === 0) {
    return allUsersLabel;
  }

  return roles.map(getRoleDisplayName).join(", ");
}
