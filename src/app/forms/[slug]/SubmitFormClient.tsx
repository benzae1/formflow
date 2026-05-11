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
      let detail = "";
      try {
        const errJson = (await response.json()) as { error?: { message?: string; code?: string } };
        if (errJson.error?.message) {
          detail = ` (${errJson.error.code ?? response.status}: ${errJson.error.message})`;
        }
      } catch {
        detail = ` (HTTP ${response.status})`;
      }
      console.error("[SubmitForm] API error:", response.status, detail);
      setState("error");
      setMessage(`The submission could not be saved.${detail}`);
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
      <header className="border border-[var(--line-strong)] bg-white px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
              {submissionId ? "Edit submission" : "Public form"}
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              {form.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {submissionId
                ? `This ${existingStatus?.replaceAll("_", " ")} submission is open for edits. Submitting here will ${existingStatus === "draft" ? "launch" : "resume"} the workflow.`
                : "Complete the published form below to start the approval workflow."}
            </p>
          </div>
          <Link
            href="/submissions"
            className="inline-flex border border-[var(--line-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)]"
          >
            Back to submissions
          </Link>
        </div>
      </header>

      {message ? (
        <div
          className={`border px-5 py-4 text-sm ${
            state === "error"
              ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
              : "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
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
            className="border border-[var(--line-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)] disabled:opacity-60"
          >
            Save draft
          </button>
        </div>
      ) : null}
    </main>
  );
}
