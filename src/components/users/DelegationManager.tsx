"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mutationHeaders } from "@/lib/mutation-headers";
import { formatDateTime } from "@/lib/ui";

type DelegateOption = {
  id: string;
  name: string;
  email: string;
};

type DelegationRecord = {
  id: string;
  approverId: string;
  delegateId: string;
  delegateName: string;
  startsAt: string;
  endsAt: string;
};

export default function DelegationManager({
  approverId,
  delegations,
  delegates,
  canManage,
  title = "Delegation",
  description = "Route approvals to a backup reviewer for a specific window.",
}: {
  approverId: string;
  delegations: DelegationRecord[];
  delegates: DelegateOption[];
  canManage: boolean;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegateId, setDelegateId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const availableDelegates = useMemo(
    () => delegates.filter((delegate) => delegate.id !== approverId),
    [approverId, delegates],
  );

  async function createDelegation() {
    if (!delegateId || !startsAt || !endsAt) {
      setError("Choose a delegate and both dates.");
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch("/api/delegations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({
        approverId,
        delegateId,
        startsAt,
        endsAt,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      setError(payload.error?.message ?? "Could not save delegation.");
      return;
    }

    setDelegateId("");
    setStartsAt("");
    setEndsAt("");
    router.refresh();
  }

  async function removeDelegation(id: string) {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/delegations/${id}`, {
      method: "DELETE",
      headers: mutationHeaders,
    });

    setPending(false);

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      setError(payload.error?.message ?? "Could not remove delegation.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-[22px] border border-black/10 bg-white/90 px-4 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>

      <div className="mt-4 space-y-2">
        {delegations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No active delegation records.</p>
        ) : (
          delegations.map((delegation) => (
            <div
              key={delegation.id}
              className="flex flex-col gap-3 rounded-[18px] border border-black/10 px-3 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="text-sm leading-6 text-[var(--ink)]">
                <p className="font-medium">{delegation.delegateName}</p>
                <p className="text-[var(--muted)]">
                  {formatDateTime(delegation.startsAt)} to {formatDateTime(delegation.endsAt)}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeDelegation(delegation.id)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03] disabled:opacity-60"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canManage ? (
        <div className="mt-4 space-y-3">
          <select
            value={delegateId}
            onChange={(event) => setDelegateId(event.target.value)}
            className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
          >
            <option value="">Choose delegate</option>
            {availableDelegates.map((delegate) => (
              <option key={delegate.id} value={delegate.id}>
                {delegate.name} ({delegate.email})
              </option>
            ))}
          </select>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Starts</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Ends</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-[18px] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={createDelegation}
            className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Save delegation
          </button>
        </div>
      ) : null}
    </div>
  );
}
