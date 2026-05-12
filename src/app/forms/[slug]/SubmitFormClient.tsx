"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { RenderableFormSchema } from "@/components/form-renderer/FormRenderer";

const FormRenderer = dynamic(
  () => import("@/components/form-renderer/FormRenderer").then((m) => ({ default: m.FormRenderer })),
  { ssr: false, loading: () => <div className="border border-[var(--line-strong)] bg-white p-8 text-sm text-[var(--muted)]">Loading form…</div> },
);
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
      <header style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 40,
            alignItems: "end",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--ink)",
              }}
            >
              {submissionId ? "Edit submission" : "Public form"}
            </div>
            <div
              style={{
                height: 2,
                background: "var(--ink)",
                margin: "12px 0 16px",
                width: 48,
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(32px, 4vw, 56px)",
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: "-.03em",
                color: "var(--ink)",
              }}
            >
              {form.title}
              <span style={{ color: "var(--accent)" }}>.</span>
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                marginTop: 14,
                color: "var(--muted)",
              }}
            >
              {submissionId
                ? `This ${existingStatus?.replaceAll("_", " ")} submission is open for edits. Submitting here will ${existingStatus === "draft" ? "launch" : "resume"} the workflow.`
                : "Complete the published form below to start the approval workflow."}
            </p>
          </div>
          <Link
            href="/submissions"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "12px 20px",
              background: "var(--panel)",
              color: "var(--ink)",
              border: "1px solid var(--line-strong)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← Back
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
