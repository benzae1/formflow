"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mutationHeaders } from "@/lib/mutation-headers";
import type { Locale } from "@/lib/i18n/config";
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
  locale = "en",
  title = "Delegation",
  description = "Route approvals to a backup reviewer for a specific window.",
}: {
  approverId: string;
  delegations: DelegationRecord[];
  delegates: DelegateOption[];
  canManage: boolean;
  locale?: Locale;
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
  const copy =
    locale === "de"
      ? {
          chooseDelegateAndDates: "Wählen Sie eine Vertretung und beide Zeitpunkte aus.",
          saveError: "Die Vertretung konnte nicht gespeichert werden.",
          removeError: "Die Vertretung konnte nicht entfernt werden.",
          noRecords: "Keine aktiven Vertretungen vorhanden.",
          remove: "Entfernen",
          chooseDelegate: "Vertretung wählen",
          starts: "Beginn",
          ends: "Ende",
          save: "Vertretung speichern",
          to: "bis",
        }
      : {
          chooseDelegateAndDates: "Choose a delegate and both dates.",
          saveError: "Could not save delegation.",
          removeError: "Could not remove delegation.",
          noRecords: "No active delegation records.",
          remove: "Remove",
          chooseDelegate: "Choose delegate",
          starts: "Starts",
          ends: "Ends",
          save: "Save delegation",
          to: "to",
        };

  async function createDelegation() {
    if (!delegateId || !startsAt || !endsAt) {
      setError(copy.chooseDelegateAndDates);
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch("/api/delegations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({ approverId, delegateId, startsAt, endsAt }),
    });

    setPending(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? copy.saveError);
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
      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? copy.removeError);
      return;
    }

    router.refresh();
  }

  return (
    <div className="bf-panel-muted px-4 py-4">
      <div>
        <p className="bf-eyebrow">{title}</p>
        <p className="mt-3 text-sm text-[var(--muted-strong)]">{description}</p>
      </div>

      <div className="mt-4 bf-list">
        {delegations.length === 0 ? (
          <p className="text-sm text-[var(--muted-strong)]">{copy.noRecords}</p>
        ) : (
          delegations.map((delegation) => (
            <div
              key={delegation.id}
              className="bf-panel flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="text-sm text-[var(--ink)]">
                <p className="font-semibold">{delegation.delegateName}</p>
                <p className="text-[var(--muted-strong)]">
                  {formatDateTime(delegation.startsAt, locale)} {copy.to} {formatDateTime(delegation.endsAt, locale)}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeDelegation(delegation.id)}
                  className="bf-btn disabled:opacity-60"
                >
                  {copy.remove}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canManage ? (
        <div className="mt-4 bf-stack">
          <select value={delegateId} onChange={(event) => setDelegateId(event.target.value)} className="bf-select">
            <option value="">{copy.chooseDelegate}</option>
            {availableDelegates.map((delegate) => (
              <option key={delegate.id} value={delegate.id}>
                {delegate.name} ({delegate.email})
              </option>
            ))}
          </select>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="bf-kicker">{copy.starts}</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="bf-input"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="bf-kicker">{copy.ends}</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="bf-input"
              />
            </label>
          </div>

          {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

          <button
            type="button"
            disabled={pending}
            onClick={createDelegation}
            className="bf-btn bf-btn-primary w-full disabled:opacity-60"
          >
            {copy.save}
          </button>
        </div>
      ) : null}
    </div>
  );
}
