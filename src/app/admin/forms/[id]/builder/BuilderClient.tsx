"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";

const FormBuilder = dynamic(
  () => import("@/components/form-builder/FormBuilder").then((m) => ({ default: m.FormBuilder })),
  {
    ssr: false,
    loading: () => <div className="bf-panel p-8 text-sm text-[var(--muted-strong)]">Loading builder...</div>,
  },
);
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
    <main className="bf-stack">
      <header className="bf-panel px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="bf-eyebrow">Builder</p>
            <div className="bf-rule mt-3" />
            <h1 className="mt-5 text-[clamp(36px,5vw,64px)] font-extrabold leading-[0.9]">
              {title}
              <span className="text-[var(--accent)]">.</span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={form.status} />
              <StatusBadge status={sensitivity} />
              <span className="bf-pill">Version {form.version}</span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-5 lg:items-end">
            <div className="bf-primitive-row">
              <PrimitiveMark shape="circle" color="var(--haus-teal)" size={34} />
              <PrimitiveMark shape="square" color="var(--haus-red)" size={34} />
              <PrimitiveMark shape="triangle" color="var(--haus-yellow)" size={34} />
            </div>
            <div className="bf-action-row">
              <Link href={`/forms/${slug}?preview=1`} className="bf-btn bf-btn-segment">
                Preview
              </Link>
              <button onClick={() => save("draft")} disabled={saving} type="button" className="bf-btn bf-btn-segment disabled:opacity-60">
                Save draft
              </button>
              <button
                onClick={() => save("published")}
                disabled={saving}
                type="button"
                className="bf-btn bf-btn-primary bf-btn-segment disabled:opacity-60"
              >
                Publish
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <div className={`mt-4 bf-alert ${message.includes("could not") ? "bf-alert-error" : "bf-alert-success"}`}>
            {message}
          </div>
        ) : null}
      </header>

      <section className="bf-panel p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="bf-eyebrow">Form settings</p>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Manage metadata and route assignment before you drop into the full-width builder workspace.
            </p>
          </div>
          <button type="button" onClick={() => setPreview((current) => !current)} className="bf-btn">
            {preview ? "Back to builder" : "Preview schema JSON"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Form title" className="bf-input" />
          <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="form-slug" className="bf-input" />
          <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as BuilderForm["sensitivity"])} className="bf-select">
            <option value="standard">Standard</option>
            <option value="pii">PII</option>
            <option value="sensitive">Sensitive</option>
          </select>
          <select value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} className="bf-select">
            <option value="">No workflow assigned</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bf-panel-muted mt-4 p-4">
          <p className="bf-kicker">Field access tips</p>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted-strong)] lg:grid-cols-2">
            <p>Use the field settings panel below to control encryption and read access by role.</p>
            <p>Schema changes on published forms will create new form versions automatically.</p>
          </div>
        </div>

        {fieldSettings.length > 0 ? (
          <div className="bf-panel-muted mt-4 p-4">
            <p className="bf-kicker">Field access settings</p>
            <div className="mt-4 bf-list">
              {fieldSettings.map((field) => (
                <article key={field.key} className="bf-panel px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{field.label}</p>
                      <p className="bf-kicker mt-1">{field.key}</p>
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
                        <span className="bf-kicker">Read roles</span>
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
                          className="bf-input"
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

      <section className="bf-stack">
        <div className="bf-panel px-5 py-4">
          <p className="bf-eyebrow">Builder canvas</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            Drag components into a full-width workspace with metadata controls now moved above the builder.
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
