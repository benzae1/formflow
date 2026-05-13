"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DelegationManager from "@/components/users/DelegationManager";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mutationHeaders } from "@/lib/mutation-headers";
import { formatDateTime, getRoleLabel } from "@/lib/ui";

type RoleRecord = {
  name: string;
  label: string | null;
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

export default function AdminUsersClient({
  users,
  availableRoles,
  delegations,
  delegateOptions,
}: {
  users: UserRecord[];
  availableRoles: RoleRecord[];
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
}) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function updateRoles(userId: string, roles: string[]) {
    setPendingUserId(userId);
    setError(null);

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
      setError(payload.error?.message ?? "Could not save role changes.");
      return;
    }

    router.refresh();
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
      if (roleFilter && !user.roles.some((r) => r.name === roleFilter)) return false;
      if (statusFilter === "active" && user.deactivatedAt) return false;
      if (statusFilter === "deactivated" && !user.deactivatedAt) return false;
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="bf-stack">
      {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

      <div className="bf-filter-bar">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email"
          className="bf-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bf-select"
        >
          <option value="">All roles</option>
          {availableRoles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.label ?? getRoleLabel(role.name)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bf-select"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      <section className="bf-list">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-[var(--muted-strong)] px-1">No users match the current filters.</p>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              availableRoles={availableRoles}
              delegations={delegations.filter((d) => d.approverId === user.id)}
              delegateOptions={delegateOptions}
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

function UserCard({
  user,
  availableRoles,
  delegations,
  delegateOptions,
  pending,
  expanded,
  onToggle,
  onSaveRoles,
}: {
  user: UserRecord;
  availableRoles: RoleRecord[];
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
  pending: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSaveRoles: (roles: string[]) => Promise<void>;
}) {
  const [roles, setRoles] = useState<string[]>(user.roles.map((role) => role.name));

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
            <p className="mt-1 text-sm text-[var(--muted-strong)]">Updated {formatDateTime(user.updatedAt)}</p>
          </div>

          <div className="flex flex-wrap items-start gap-2 xl:items-center">
            {user.roles.map((role) => (
              <StatusBadge key={role.name} status={role.name} />
            ))}
            {user.deactivatedAt ? <StatusBadge status="archived" /> : null}
            <span
              className="ml-2 text-xs font-bold tracking-widest uppercase text-[var(--muted)]"
              aria-hidden="true"
            >
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 xl:grid-cols-3">
          <div className="bf-panel-muted px-4 py-4">
            <p className="bf-eyebrow">Roles</p>
            <div className="mt-3 space-y-4">
              {availableRoles.map((role) => (
                <label key={role.name} className="flex items-center gap-3 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={roles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                  />
                  <span>{role.label ?? getRoleLabel(role.name)}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={pending || roles.length === 0}
              onClick={() => onSaveRoles(roles)}
              className="bf-btn bf-btn-primary mt-4 disabled:opacity-60"
            >
              Save roles
            </button>
          </div>

          <div className="bf-panel-muted px-4 py-4">
            <p className="bf-eyebrow">Org memberships</p>
            <div className="mt-3 space-y-2">
              {user.memberships.length === 0 ? (
                <p className="text-sm text-[var(--muted-strong)]">No memberships synced.</p>
              ) : (
                user.memberships.map((membership) => (
                  <p key={membership.id} className="text-sm text-[var(--ink)]">
                    {membership.orgUnit.name} | {membership.roleInUnit ?? "member"}
                    {membership.isManager ? " | manager" : ""}
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
            description="Admins can set backup approvers for date-bound coverage."
          />
        </div>
      )}
    </article>
  );
}
