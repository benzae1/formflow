"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mutationHeaders } from "@/lib/mutation-headers";
import {
  collectFormFieldSettings,
  type FormioSchema,
  updateFormFieldSettings,
} from "@/lib/formio-schema";

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
  const fieldSettings = collectFormFieldSettings(schema as FormioSchema);

  async function save(status?: "draft" | "published" | "archived") {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({ title, slug, sensitivity, workflowId: workflowId || null, schema, status }),
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
      <header className="border border-[var(--line-strong)] bg-white p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
              Builder
            </p>
            <h1 className="mt-2 text-4xl font-bold">{title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={form.status} />
              <StatusBadge status={sensitivity} />
              <span className="border border-[var(--line-strong)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-[var(--ink)]">
                Version {form.version}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/forms/${slug}`}
              className="border border-[var(--line-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)]"
            >
              Preview public form
            </Link>
            <button
              className="border border-[var(--line-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)] disabled:opacity-60"
              onClick={() => save("draft")}
              disabled={saving}
              type="button"
            >
              Save draft
            </button>
            <button
              className="bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              onClick={() => save("published")}
              disabled={saving}
              type="button"
            >
              Publish
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
            {message}
          </div>
        ) : null}
      </header>

      <section className="space-y-4 border border-[var(--line-strong)] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
              Form settings
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Manage metadata and route assignment before you drop into the full-width builder workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreview((current) => !current)}
            className="border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)]"
          >
            {preview ? "Back to builder" : "Preview schema JSON"}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Form title"
            className="w-full border border-[var(--line-strong)] bg-[var(--canvas)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
          />
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="form-slug"
            className="w-full border border-[var(--line-strong)] bg-[var(--canvas)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
          />
          <select
            value={sensitivity}
            onChange={(event) => setSensitivity(event.target.value as BuilderForm["sensitivity"])}
            className="w-full border border-[var(--line-strong)] bg-[var(--canvas)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
          >
            <option value="standard">Standard</option>
            <option value="pii">PII</option>
            <option value="sensitive">Sensitive</option>
          </select>
          <select
            value={workflowId}
            onChange={(event) => setWorkflowId(event.target.value)}
            className="w-full border border-[var(--line-strong)] bg-[var(--canvas)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
          >
            <option value="">No workflow assigned</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-[var(--line)] bg-[var(--canvas)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--muted)]">
            Field access tips
          </p>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] lg:grid-cols-2">
            <p>Use the field settings panel below to control encryption and read access by role.</p>
            <p>Schema changes on published forms will create new form versions automatically.</p>
          </div>
        </div>

        {fieldSettings.length > 0 ? (
          <div className="border border-[var(--line)] bg-[var(--canvas)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--muted)]">
              Field access settings
            </p>
            <div className="mt-4 space-y-4">
              {fieldSettings.map((field) => (
                <article
                  key={field.key}
                  className="border border-[var(--line-strong)] bg-white p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{field.label}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--muted)]">
                        {field.key}
                      </p>
                    </div>
                    <div className="grid gap-3 lg:min-w-[24rem]">
                      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={field.sensitive}
                          onChange={(event) =>
                            setSchema((current) =>
                              updateFormFieldSettings(current as FormioSchema, field.key, {
                                sensitive: event.target.checked,
                              }) as FormBuilderSchema,
                            )
                          }
                        />
                        Encrypt this field at rest
                      </label>
                      <label className="grid gap-2 text-sm text-[var(--ink)]">
                        <span>Read roles</span>
                        <input
                          value={field.readRoles.join(", ")}
                          onChange={(event) =>
                            setSchema((current) =>
                              updateFormFieldSettings(current as FormioSchema, field.key, {
                                readRoles: event.target.value
                                  .split(",")
                                  .map((role) => role.trim())
                                  .filter(Boolean),
                              }) as FormBuilderSchema,
                            )
                          }
                          placeholder="admin, compliance"
                          className="border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={field.ownerCanRead}
                          onChange={(event) =>
                            setSchema((current) =>
                              updateFormFieldSettings(current as FormioSchema, field.key, {
                                ownerCanRead: event.target.checked,
                              }) as FormBuilderSchema,
                            )
                          }
                        />
                        Submitter can read their own value
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="border border-[var(--line-strong)] bg-white px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
            Builder canvas
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Drag components into a full-width workspace with the metadata controls now moved above the builder.
          </p>
        </div>

        {preview ? (
          <pre className="min-h-[72vh] overflow-x-auto border border-[var(--line-strong)] bg-[var(--ink)] p-5 font-mono text-sm leading-7 text-white">
            {JSON.stringify(schema, null, 2)}
          </pre>
        ) : (
          <FormBuilder schema={schema} onChange={setSchema} />
        )}
      </section>
    </main>
  );
}
