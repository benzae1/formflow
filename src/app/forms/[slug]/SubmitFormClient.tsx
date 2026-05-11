"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
import type { RenderableFormSchema } from "@/components/form-renderer/FormRenderer";
import { mutationHeaders } from "@/lib/mutation-headers";

type PublicForm = {
  id: string;
  title: string;
  schema: RenderableFormSchema;
};

export default function SubmitFormClient({
  form,
  submissionId,
  initialData,
  existingStatus,
}: {
  form: PublicForm;
  submissionId?: string;
  initialData?: Record<string, unknown>;
  existingStatus?: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [latestData, setLatestData] = useState<Record<string, unknown>>(initialData ?? {});
  const router = useRouter();

  async function submit(data: Record<string, unknown>, options?: { saveAsDraft?: boolean }) {
    setState("saving");
    setMessage(null);

    let response: Response;

    try {
      response = submissionId
        ? await fetch(`/api/submissions/${submissionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...mutationHeaders },
            body: JSON.stringify({
              data,
              submit: options?.saveAsDraft ? false : existingStatus === "draft",
            }),
          })
        : await fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...mutationHeaders },
            body: JSON.stringify({
              formId: form.id,
              data,
              saveAsDraft: options?.saveAsDraft ?? false,
            }),
          });
    } catch {
      setState("error");
      setMessage("The submission could not be saved. Please try again.");
      return;
    }

    if (!response.ok) {
      setState("error");
      setMessage("The submission could not be saved. Please try again.");
      return;
    }

    const json = (await response.json()) as {
      submission: { id: string };
    };

    setState("idle");
    setMessage(
      options?.saveAsDraft
        ? "Draft saved. Redirecting to the case file..."
        : submissionId
        ? "Submission updated. Redirecting back to the case file..."
        : "Submission received. Redirecting to the case file...",
    );

    setTimeout(() => {
      router.push(`/submissions/${json.submission.id}`);
      router.refresh();
    }, 600);
  }

  async function saveDraft() {
    await submit(latestData, { saveAsDraft: true });
  }

  const canSaveDraft = !submissionId || existingStatus === "draft";

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="rounded-[30px] border border-[var(--line)] bg-[var(--panel)] px-6 py-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              {submissionId ? "Edit submission" : "Public form"}
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl">
              {form.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {submissionId
                ? `This ${existingStatus?.replaceAll("_", " ")} submission is open for edits. Submitting here will ${existingStatus === "draft" ? "launch" : "resume"} the workflow.`
                : "Complete the published form below to start the approval workflow."}
            </p>
          </div>
          <Link
            href="/submissions"
            className="inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
          >
            Back to submissions
          </Link>
        </div>
      </header>

      {message ? (
        <div
          className={`rounded-[22px] border px-5 py-4 text-sm ${
            state === "error"
              ? "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]"
              : "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]"
          }`}
        >
          {message}
        </div>
      ) : null}

      <FormRenderer
        schema={form.schema}
        initialData={initialData}
        onChange={setLatestData}
        onSubmit={(data) => submit(data)}
      />

      {canSaveDraft ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveDraft}
            disabled={state === "saving"}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03] disabled:opacity-60"
          >
            Save draft
          </button>
        </div>
      ) : null}
    </main>
  );
}
