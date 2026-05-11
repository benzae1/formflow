"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DelegationManager from "@/components/users/DelegationManager";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mutationHeaders } from "@/lib/mutation-headers";
import { formatDateTime, getRoleLabel } from "@/lib/ui";

type AppRole = "admin" | "submitter" | "approver" | "compliance";

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  roles: AppRole[];
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

const roleOptions: AppRole[] = ["submitter", "approver", "admin", "compliance"];

export default function AdminUsersClient({
  users,
  delegations,
  delegateOptions,
}: {
  users: UserRecord[];
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
}) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRoles(userId: string, roles: AppRole[]) {
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
    <section className="space-y-3">
      {error ? (
        <div className="rounded-[20px] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
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
  delegations,
  delegateOptions,
  pending,
  onSaveRoles,
}: {
  user: UserRecord;
  delegations: DelegationRecord[];
  delegateOptions: DelegateOption[];
  pending: boolean;
  onSaveRoles: (roles: AppRole[]) => Promise<void>;
}) {
  const [roles, setRoles] = useState<AppRole[]>(user.roles);

  function toggleRole(role: AppRole) {
    setRoles((current) => {
      if (current.includes(role)) {
        return current.filter((value) => value !== role);
      }

      return [...current, role].sort(
        (left, right) => roleOptions.indexOf(left) - roleOptions.indexOf(right),
      );
    });
  }

  const canManageDelegation = roles.includes("approver") || roles.includes("admin");

  return (
    <article className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{user.name ?? user.email}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{user.email}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Updated {formatDateTime(user.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <StatusBadge key={role} status={role} />
          ))}
          {user.deactivatedAt ? <StatusBadge status="archived" /> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
            Roles
          </p>
          <div className="mt-3 space-y-3">
            {roleOptions.map((role) => (
              <label key={role} className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4 rounded border-black/20"
                />
                <span>{getRoleLabel(role)}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={pending || roles.length === 0}
            onClick={() => onSaveRoles(roles)}
            className="mt-4 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Save roles
          </button>
        </div>

        <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
            Org memberships
          </p>
          <div className="mt-3 space-y-2">
            {user.memberships.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No memberships synced.</p>
            ) : (
              user.memberships.map((membership) => (
                <p key={membership.id} className="text-sm leading-7 text-[var(--ink)]">
                  {membership.orgUnit.name} • {membership.roleInUnit ?? "member"}
                  {membership.isManager ? " • manager" : ""}
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
