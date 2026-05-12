"use client";

import { useState } from "react";
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

  return (
    <section className="bf-list">
      {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          availableRoles={availableRoles}
          delegations={delegations.filter((delegation) => delegation.approverId === user.id)}
          delegateOptions={delegateOptions}
          pending={pendingUserId === user.id}
          onSaveRoles={(roles) => updateRoles(user.id, roles)}
        />
      ))}
    </section>
  );
}

function UserCard({
  user,
  availableRoles,
  delegations,
  delegateOptions,
  pending,
  onSaveRoles,
}: {
  user: UserRecord;
  availableRoles: RoleRecord[];
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
  pending: boolean;
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
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-[30px] font-extrabold leading-none">{user.name ?? user.email}</h2>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">{user.email}</p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">Updated {formatDateTime(user.updatedAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <StatusBadge key={role.name} status={role.name} />
          ))}
          {user.deactivatedAt ? <StatusBadge status="archived" /> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="bf-panel-muted px-4 py-4">
          <p className="bf-eyebrow">Roles</p>
          <div className="mt-3 space-y-3">
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
    </article>
  );
}
