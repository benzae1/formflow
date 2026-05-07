"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";
import { StatusBadge } from "@/components/ui/StatusBadge";

type BuilderForm = {
  id: string;
  title: string;
  slug: string;
  version: number;
  status: "draft" | "published" | "archived";
  sensitivity: "standard" | "pii" | "sensitive";
  workflowId?: string | null;
  schema: FormBuilderSchema;
};

type WorkflowOption = {
  id: string;
  name: string;
};

export default function BuilderClient({
  form,
  workflows,
}: {
  form: BuilderForm;
  workflows: WorkflowOption[];
}) {
  const [schema, setSchema] = useState(form.schema);
  const [title, setTitle] = useState(form.title);
  const [slug, setSlug] = useState(form.slug);
  const [sensitivity, setSensitivity] = useState(form.sensitivity);
  const [workflowId, setWorkflowId] = useState(form.workflowId ?? "");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function save(status?: "draft" | "published" | "archived") {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        sensitivity,
        workflowId: workflowId || null,
        schema,
        status,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setMessage("The builder changes could not be saved.");
      return;
    }

    setMessage(status === "published" ? "Form published." : "Draft saved.");
    router.refresh();
  }

  return (
    <main className="space-y-6">
      <header className="rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Builder
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl">{title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={form.status} />
              <StatusBadge status={sensitivity} />
              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink)]">
                Version {form.version}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/forms/${slug}`}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
            >
              Preview public form
            </Link>
            <button
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
              onClick={() => save("draft")}
              disabled={saving}
              type="button"
            >
              Save draft
            </button>
            <button
              className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              onClick={() => save("published")}
              disabled={saving}
              type="button"
            >
              Publish
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-[20px] border border-[var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
            {message}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] px-5 py-4 shadow-[var(--shadow-md)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                Builder canvas
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Drag components into a full-width workspace, then use the settings rail to fine-tune routing and metadata.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPreview((current) => !current)}
              className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
            >
              {preview ? "Back to builder" : "Preview schema JSON"}
            </button>
          </div>

          {preview ? (
            <pre className="min-h-[72vh] overflow-x-auto rounded-[28px] border border-[var(--line)] bg-[var(--ink)] p-5 font-mono text-sm leading-7 text-white shadow-[var(--shadow-md)]">
              {JSON.stringify(schema, null, 2)}
            </pre>
          ) : (
            <FormBuilder schema={schema} onChange={setSchema} />
          )}
        </section>

        <aside className="space-y-4 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)] 2xl:sticky 2xl:top-6 2xl:self-start">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              Form settings
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Manage metadata and route assignment without leaving the schema builder.
            </p>
          </div>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Form title"
            className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
          />
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="form-slug"
            className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
          />
          <select
            value={sensitivity}
            onChange={(event) => setSensitivity(event.target.value as BuilderForm["sensitivity"])}
            className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
          >
            <option value="standard">Standard</option>
            <option value="pii">PII</option>
            <option value="sensitive">Sensitive</option>
          </select>
          <select
            value={workflowId}
            onChange={(event) => setWorkflowId(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
          >
            <option value="">No workflow assigned</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>

          <div className="rounded-[24px] border border-black/10 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
              Field access tips
            </p>
            <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
              <p>Use Form.io component custom properties to set `sensitive`, `readRoles`, and `ownerCanRead`.</p>
              <p>Schema changes on published forms will create new form versions automatically.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
