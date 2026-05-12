"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { mutationHeaders } from "@/lib/mutation-headers";

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

    try {
      const response = await fetch(`/api/submissions/${submissionId}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...mutationHeaders },
        body: JSON.stringify({
          taskId: pendingTask.id,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        setError("Decision could not be recorded.");
        return;
      }

      router.push("/inbox");
      router.refresh();
    } catch {
      setError("Decision could not be recorded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="bf-panel p-6">
      <p className="bf-eyebrow">Next action</p>

      {canEdit ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-7 text-[var(--muted-strong)]">
            This submission can still be edited and sent back into the workflow.
          </p>
          <Link href={`/forms/${formSlug}?submissionId=${submissionId}`} className="bf-btn bf-btn-primary">
            {status === "draft" ? "Continue draft" : "Edit and resubmit"}
          </Link>
        </div>
      ) : null}

      {canAct && pendingTask ? (
        <div className="mt-4">
          {decision ? (
            <form onSubmit={submitDecision} className="space-y-4">
              <div className="bf-panel-muted p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {decisions.find((item) => item.action === decision)?.label}
                </p>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="bf-textarea mt-3"
                  placeholder="Add context for the audit trail or the submitter."
                />
              </div>

              {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

              <div className="bf-action-row">
                <button type="submit" disabled={pending} className="bf-btn bf-btn-primary disabled:opacity-60">
                  {pending ? "Recording..." : "Confirm decision"}
                </button>
                <button type="button" onClick={() => setDecision(null)} className="bf-btn bf-btn-segment">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[var(--muted-strong)]">
                A pending approval task is assigned to you for this submission.
              </p>
              <div className="bf-action-row">
                {decisions.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    onClick={() => setDecision(item.action)}
                    className={`bf-btn ${item.tone === "primary" ? "bf-btn-primary" : ""} bf-btn-segment`}
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
        <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
          No further action is required from this screen right now.
        </p>
      ) : null}
    </section>
  );
}
