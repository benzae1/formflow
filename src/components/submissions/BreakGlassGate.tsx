"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getMutationHeaders } from "@/lib/mutation-headers";

export function BreakGlassGate({
  backHref,
  scope,
  dictionary,
  returnTo,
}: {
  backHref: string;
  scope: string;
  dictionary: Dictionary;
  returnTo: string;
}) {
  const d = dictionary.submissions;
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const mutationHeaders = await getMutationHeaders();
      const response = await fetch("/api/sensitive-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...mutationHeaders,
        },
        body: JSON.stringify({
          scope,
          reason,
        }),
      });

      if (!response.ok) {
        setError(
          dictionary.common.notAvailable === "Nicht verfügbar"
            ? "Die Zugriffsfreigabe konnte nicht erstellt werden."
            : "Could not create the access grant.",
        );
        setPending(false);
        return;
      }

      router.push(returnTo);
      router.refresh();
    } catch {
      setError(
        dictionary.common.notAvailable === "Nicht verfügbar"
          ? "Die Zugriffsfreigabe konnte nicht erstellt werden."
          : "Could not create the access grant.",
      );
      setPending(false);
    }
  }

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow={d.breakGlassEyebrow}
        title={d.breakGlassTitle}
        description={d.breakGlassDescription}
      />

      <section className="bf-panel p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[var(--ink)] mb-2">
            {d.breakGlassLabel}
          </label>
          <textarea
            className="bf-textarea w-full"
            placeholder={d.breakGlassPlaceholder}
            minLength={10}
            required
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {error ? (
            <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <div className="bf-action-row mt-4">
            <button type="submit" className="bf-btn bf-btn-primary" disabled={pending}>
              {pending ? dictionary.common.loading : d.breakGlassSubmit}
            </button>
            <Link href={backHref} className="bf-btn">
              {d.breakGlassCancel}
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
