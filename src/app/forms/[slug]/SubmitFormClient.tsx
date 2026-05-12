"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import type { RenderableFormSchema } from "@/components/form-renderer/FormRenderer";

const FormRenderer = dynamic(
  () => import("@/components/form-renderer/FormRenderer").then((m) => ({ default: m.FormRenderer })),
  {
    ssr: false,
    loading: () => <div className="bf-panel p-8 text-sm text-[var(--muted-strong)]">Loading form...</div>,
  },
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
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="bf-panel px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="bf-eyebrow">{submissionId ? "Edit submission" : "Published form"}</p>
            <div className="bf-rule mt-3" />
            <h1 className="mt-5 text-[clamp(38px,6vw,72px)] font-extrabold leading-[0.9]">
              {form.title}
              <span className="text-[var(--accent)]">.</span>
            </h1>
            <p className="mt-4 max-w-[48ch] text-sm leading-7 text-[var(--muted-strong)]">
              {submissionId
                ? `This ${existingStatus?.replaceAll("_", " ")} submission is open for edits. Submitting here will ${existingStatus === "draft" ? "launch" : "resume"} the workflow.`
                : "Complete the published form below to start the approval workflow."}
            </p>
          </div>

          <div className="flex flex-col items-start gap-5 lg:items-end">
            <div className="bf-primitive-row">
              <PrimitiveMark shape="circle" color="var(--haus-teal)" size={34} />
              <PrimitiveMark shape="square" color="var(--haus-red)" size={34} />
              <PrimitiveMark shape="triangle" color="var(--haus-yellow)" size={34} />
            </div>
            <Link href="/submissions" className="bf-btn">
              Back
            </Link>
          </div>
        </div>
      </header>

      {message ? (
        <div className={`bf-alert ${state === "error" ? "bf-alert-error" : "bf-alert-success"}`}>{message}</div>
      ) : null}

      <FormRenderer schema={form.schema} initialData={initialData} onChange={setLatestData} onSubmit={(data) => submit(data)} />

      {canSaveDraft ? (
        <div className="flex justify-end">
          <button type="button" onClick={saveDraft} disabled={state === "saving"} className="bf-btn disabled:opacity-60">
            Save draft
          </button>
        </div>
      ) : null}
    </main>
  );
}
