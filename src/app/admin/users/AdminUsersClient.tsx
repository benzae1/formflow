"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DelegationManager from "@/components/users/DelegationManager";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getMutationHeaders } from "@/lib/mutation-headers";
import { formatDateTime } from "@/lib/ui";

type RoleRecord = {
  id: string;
  name: string;
  label: string | null;
  protected: boolean;
};

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  roles: RoleRecord[];
  deactivatedAt: string | null;
  updatedAt: string;
  memberships: Array<{
    id: string;
    orgUnit: { name: string };
    roleInUnit: string | null;
    isManager: boolean;
  }>;
};

type DelegationRecord = {
  id: string;
  approverId: string;
  delegateId: string;
  delegateName: string;
  startsAt: string;
  endsAt: string;
};

type DelegateOption = {
  id: string;
  name: string;
  email: string;
};

type RoleMutationMode = "create" | "update" | "delete";

export default function AdminUsersClient({
  users,
  availableRoles,
  delegations,
  delegateOptions,
  locale,
  dictionary,
}: {
  users: UserRecord[];
  availableRoles: RoleRecord[];
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
  locale: Locale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const copy = dictionary.adminUsers;
  const [rolesState, setRolesState] = useState<RoleRecord[]>(availableRoles);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [mutatingRoleId, setMutatingRoleId] = useState<string | null>(null);
  const [roleAction, setRoleAction] = useState<RoleMutationMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setRolesState(availableRoles);
  }, [availableRoles]);

  async function refreshUsers() {
    router.refresh();
  }

  async function updateRoles(userId: string, roles: string[]) {
    setPendingUserId(userId);
    setError(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch(`/api/users/${userId}/roles`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({ roles }),
    });

    setPendingUserId(null);

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      setError(payload.error?.message ?? copy.saveError);
      return;
    }

    await refreshUsers();
  }

  async function createRole(input: { name: string; label: string }) {
    setMutatingRoleId("new");
    setRoleAction("create");
    setError(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify(input),
    });

    setMutatingRoleId(null);
    setRoleAction(null);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? copy.roleError);
      return false;
    }

    const payload = (await response.json()) as { role: RoleRecord };
    setRolesState((current) => sortRoleRecords([...current, payload.role]));
    await refreshUsers();
    return true;
  }

  async function updateRole(roleId: string, input: { name: string; label: string }) {
    const currentRole = rolesState.find((role) => role.id === roleId);
    setMutatingRoleId(roleId);
    setRoleAction("update");
    setError(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch(`/api/roles/${roleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify(input),
    });

    setMutatingRoleId(null);
    setRoleAction(null);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? copy.roleError);
      return false;
    }

    const payload = (await response.json()) as { role: RoleRecord };
    setRolesState((current) =>
      sortRoleRecords(current.map((role) => (role.id === roleId ? payload.role : role))),
    );
    if (currentRole && roleFilter === currentRole.name) {
      setRoleFilter(payload.role.name);
    }
    await refreshUsers();
    return true;
  }

  async function deleteRole(role: RoleRecord) {
    setMutatingRoleId(role.id);
    setRoleAction("delete");
    setError(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch(`/api/roles/${role.id}`, {
      method: "DELETE",
      headers: mutationHeaders,
    });

    setMutatingRoleId(null);
    setRoleAction(null);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? copy.roleError);
      return false;
    }

    setRolesState((current) => current.filter((item) => item.id !== role.id));
    if (roleFilter === role.name) {
      setRoleFilter("");
    }
    await refreshUsers();
    return true;
  }

  function toggleExpanded(userId: string) {
    setExpandedUserId((current) => (current === userId ? null : userId));
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (q) {
        const name = (user.name ?? "").toLowerCase();
        const email = user.email.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      if (roleFilter && !user.roles.some((role) => role.name === roleFilter)) return false;
      if (statusFilter === "active" && user.deactivatedAt) return false;
      if (statusFilter === "deactivated" && !user.deactivatedAt) return false;
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="bf-stack">
      {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

      <RoleManagementPanel
        roles={rolesState}
        copy={copy}
        pendingRoleId={mutatingRoleId}
        pendingAction={roleAction}
        onCreateRole={createRole}
        onUpdateRole={updateRole}
        onDeleteRole={deleteRole}
      />

      <div className="bf-filter-bar">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="bf-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bf-select"
        >
          <option value="">{copy.allRoles}</option>
          {rolesState.map((role) => (
            <option key={role.id} value={role.name}>
              {getRoleDisplayName(role)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bf-select"
        >
          <option value="">{copy.allStatuses}</option>
          <option value="active">{copy.active}</option>
          <option value="deactivated">{copy.deactivated}</option>
        </select>
      </div>

      <section className="bf-list">
        {filteredUsers.length === 0 ? (
          <p className="px-1 text-sm text-[var(--muted-strong)]">{copy.noMatches}</p>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              availableRoles={rolesState}
              delegations={delegations.filter((delegation) => delegation.approverId === user.id)}
              delegateOptions={delegateOptions}
              locale={locale}
              dictionary={dictionary}
              pending={pendingUserId === user.id}
              expanded={expandedUserId === user.id}
              onToggle={() => toggleExpanded(user.id)}
              onSaveRoles={(roles) => updateRoles(user.id, roles)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function RoleManagementPanel({
  roles,
  copy,
  pendingRoleId,
  pendingAction,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: {
  roles: RoleRecord[];
  copy: Dictionary["adminUsers"];
  pendingRoleId: string | null;
  pendingAction: RoleMutationMode | null;
  onCreateRole: (input: { name: string; label: string }) => Promise<boolean>;
  onUpdateRole: (roleId: string, input: { name: string; label: string }) => Promise<boolean>;
  onDeleteRole: (role: RoleRecord) => Promise<boolean>;
}) {
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");

  async function handleCreateRole() {
    const created = await onCreateRole({
      name: newRoleName.trim(),
      label: newRoleLabel.trim(),
    });

    if (!created) {
      return;
    }

    setNewRoleName("");
    setNewRoleLabel("");
  }

  return (
    <section className="bf-panel p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <div className="bf-panel-muted p-5">
          <p className="bf-eyebrow">{copy.rolePanelEyebrow}</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
            {copy.rolePanelTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            {copy.rolePanelDescription}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            {copy.roleAssignmentsRefresh}
          </p>
        </div>

        <div className="bf-panel-muted p-5">
          <p className="bf-eyebrow">{copy.newRoleTitle}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="bf-kicker">{copy.roleSlug}</span>
              <input
                type="text"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder={copy.roleSlugHint}
                className="bf-input"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="bf-kicker">{copy.roleLabel}</span>
              <input
                type="text"
                value={newRoleLabel}
                onChange={(event) => setNewRoleLabel(event.target.value)}
                placeholder={copy.roleLabelHint}
                className="bf-input"
              />
            </label>
          </div>
          <p className="mt-3 text-sm text-[var(--muted-strong)]">{copy.slugHelp}</p>
          <button
            type="button"
            onClick={handleCreateRole}
            disabled={pendingRoleId === "new" || !newRoleName.trim() || !newRoleLabel.trim()}
            className="bf-btn bf-btn-primary mt-4 disabled:opacity-60"
          >
            {pendingRoleId === "new" && pendingAction === "create" ? copy.creatingRole : copy.createRole}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="bf-eyebrow">{copy.existingRoles}</p>
        <div className="mt-4 grid gap-3">
          {roles.length === 0 ? (
            <p className="text-sm text-[var(--muted-strong)]">{copy.noRoles}</p>
          ) : (
            roles.map((role) => (
              <RoleRow
                key={role.id}
                role={role}
                copy={copy}
                pending={pendingRoleId === role.id}
                pendingAction={pendingAction}
                onUpdateRole={onUpdateRole}
                onDeleteRole={onDeleteRole}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function RoleRow({
  role,
  copy,
  pending,
  pendingAction,
  onUpdateRole,
  onDeleteRole,
}: {
  role: RoleRecord;
  copy: Dictionary["adminUsers"];
  pending: boolean;
  pendingAction: RoleMutationMode | null;
  onUpdateRole: (roleId: string, input: { name: string; label: string }) => Promise<boolean>;
  onDeleteRole: (role: RoleRecord) => Promise<boolean>;
}) {
  const [name, setName] = useState(role.name);
  const [label, setLabel] = useState(role.label ?? "");

  useEffect(() => {
    setName(role.name);
    setLabel(role.label ?? "");
  }, [role.id, role.label, role.name]);

  const dirty = name.trim() !== role.name || label.trim() !== (role.label ?? "");
  const invalid = !name.trim() || !label.trim();

  return (
    <article
      className={`bf-panel px-4 py-4 ${
        role.protected ? "border-[rgba(15,23,42,0.16)] bg-[rgba(15,23,42,0.04)]" : ""
      }`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--ink)]">{getRoleDisplayName(role)}</p>
            <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
              {role.protected ? copy.protectedRole : copy.customRole}
            </span>
          </div>
          <p className="text-sm leading-6 text-[var(--muted-strong)]">
            {role.protected ? copy.builtinRoleHint : copy.customRoleHint}
          </p>
        </div>

        <label className="space-y-1 text-sm">
          <span className="bf-kicker">{copy.roleSlug}</span>
          <input
            type="text"
            value={name}
            disabled={role.protected || pending}
            onChange={(event) => setName(event.target.value)}
            className="bf-input disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="space-y-1 text-sm">
            <span className="bf-kicker">{copy.roleLabel}</span>
            <input
              type="text"
              value={label}
              disabled={role.protected || pending}
              onChange={(event) => setLabel(event.target.value)}
              className="bf-input disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            disabled={role.protected || pending || !dirty || invalid}
            onClick={() => onUpdateRole(role.id, { name: name.trim(), label: label.trim() })}
            className="bf-btn disabled:opacity-60"
          >
            {pending && pendingAction === "update" ? copy.savingRole : copy.renameRole}
          </button>
          <button
            type="button"
            disabled={role.protected || pending}
            onClick={() => onDeleteRole(role)}
            className="bf-btn disabled:opacity-60"
          >
            {pending && pendingAction === "delete" ? copy.deletingRole : copy.deleteRole}
          </button>
        </div>
      </div>
    </article>
  );
}

function UserCard({
  user,
  availableRoles,
  delegations,
  delegateOptions,
  locale,
  dictionary,
  pending,
  expanded,
  onToggle,
  onSaveRoles,
}: {
  user: UserRecord;
  availableRoles: RoleRecord[];
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
  locale: Locale;
  dictionary: Dictionary;
  pending: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSaveRoles: (roles: string[]) => Promise<void>;
}) {
  const copy = dictionary.adminUsers;
  const [roles, setRoles] = useState<string[]>(user.roles.map((role) => role.name));

  useEffect(() => {
    setRoles(user.roles.map((role) => role.name));
  }, [user.roles]);

  function toggleRole(roleName: string) {
    setRoles((current) => {
      if (current.includes(roleName)) {
        return current.filter((value) => value !== roleName);
      }

      return [...current, roleName].sort((left, right) => {
        const leftIndex = availableRoles.findIndex((role) => role.name === left);
        const rightIndex = availableRoles.findIndex((role) => role.name === right);
        return leftIndex - rightIndex;
      });
    });
  }

  const canManageDelegation = roles.includes("approver") || roles.includes("admin");

  return (
    <article className="bf-list-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-[30px] font-extrabold leading-none">{user.name ?? user.email}</h2>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">{user.email}</p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {copy.updated} {formatDateTime(user.updatedAt, locale)}
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2 xl:items-center">
            {user.roles.map((role) => (
              <StatusBadge key={role.name} status={role.name} label={getRoleDisplayName(role)} />
            ))}
            {user.deactivatedAt ? <StatusBadge status="archived" /> : null}
            <span
              className="ml-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)]"
              aria-hidden="true"
            >
              {expanded ? "^" : "v"}
            </span>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 xl:grid-cols-3">
          <div className="bf-panel-muted px-4 py-4">
            <p className="bf-eyebrow">{copy.roles}</p>
            <div className="mt-3 flex flex-col gap-3">
              {availableRoles.map((role) => (
                <label key={role.id} className="bf-panel flex items-start gap-3 px-3 py-3 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={roles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{getRoleDisplayName(role)}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      {role.name}
                    </span>
                  </span>
                  <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {role.protected ? copy.protectedRole : copy.customRole}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={pending || roles.length === 0}
              onClick={() => onSaveRoles(roles)}
              className="bf-btn bf-btn-primary mt-4 disabled:opacity-60"
            >
              {copy.saveRoles}
            </button>
          </div>

          <div className="bf-panel-muted px-4 py-4">
            <p className="bf-eyebrow">{copy.orgMemberships}</p>
            <div className="mt-3 space-y-2">
              {user.memberships.length === 0 ? (
                <p className="text-sm text-[var(--muted-strong)]">{copy.noMemberships}</p>
              ) : (
                user.memberships.map((membership) => (
                  <p key={membership.id} className="text-sm text-[var(--ink)]">
                    {membership.orgUnit.name} | {membership.roleInUnit ?? copy.member}
                    {membership.isManager ? ` | ${copy.manager}` : ""}
                  </p>
                ))
              )}
            </div>
          </div>

          <DelegationManager
            approverId={user.id}
            delegations={delegations}
            delegates={delegateOptions}
            canManage={canManageDelegation}
            locale={locale}
            copy={dictionary.delegations}
            description={copy.delegationDescription}
          />
        </div>
      ) : null}
    </article>
  );
}

function getRoleDisplayName(role: Pick<RoleRecord, "name" | "label">) {
  const label = role.label?.trim();
  return label && label.length > 0 ? label : role.name;
}

function sortRoleRecords(roles: RoleRecord[]) {
  return [...roles].sort((left, right) => {
    if (left.protected !== right.protected) {
      return left.protected ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}
