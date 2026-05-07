"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Task = {
  id: string;
  submissionId: string;
  status: string;
  dueAt?: string | Date | null;
};

type Props = {
  submissionId: string;
  formSlug: string;
  status: string;
  isOwner: boolean;
  canAct: boolean;
  pendingTask?: Task | null;
};

const decisions = [
  { action: "approve", label: "Approve", tone: "primary" },
  { action: "reject", label: "Reject", tone: "secondary" },
  { action: "revise", label: "Request revision", tone: "secondary" },
] as const;

export function SubmissionActionPanel({
  submissionId,
  formSlug,
  status,
  isOwner,
  canAct,
  pendingTask,
}: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<(typeof decisions)[number]["action"] | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isOwner && ["draft", "needs_revision"].includes(status);

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!decision || !pendingTask) return;

    setPending(true);
    setError(null);

    const response = await fetch(`/api/submissions/${submissionId}/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: pendingTask.id,
        note: note || undefined,
      }),
    });

    setPending(false);

    if (!response.ok) {
      setError("Decision could not be recorded.");
      return;
    }

    router.push("/inbox");
    router.refresh();
  }

  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
      <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
        Next action
      </p>

      {canEdit ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-7 text-[var(--muted)]">
            This submission can still be edited and sent back into the workflow.
          </p>
          <Link
            href={`/forms/${formSlug}?submissionId=${submissionId}`}
            className="inline-flex rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {status === "draft" ? "Continue draft" : "Edit and resubmit"}
          </Link>
        </div>
      ) : null}

      {canAct && pendingTask ? (
        <div className="mt-4">
          {decision ? (
            <form onSubmit={submitDecision} className="space-y-4">
              <div className="rounded-2xl border border-black/10 bg-white/90 p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {decisions.find((item) => item.action === decision)?.label}
                </p>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-2xl border border-black/10 bg-[var(--canvas)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
                  placeholder="Add context for the audit trail or the submitter."
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Recording..." : "Confirm decision"}
                </button>
                <button
                  type="button"
                  onClick={() => setDecision(null)}
                  className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[var(--muted)]">
                A pending approval task is assigned to you for this submission.
              </p>
              <div className="flex flex-wrap gap-3">
                {decisions.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    onClick={() => setDecision(item.action)}
                    className={
                      item.tone === "primary"
                        ? "rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                        : "rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!canEdit && !(canAct && pendingTask) ? (
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          No further action is required from this screen right now.
        </p>
      ) : null}
    </section>
  );
}
