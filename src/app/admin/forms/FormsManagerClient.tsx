"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mutationHeaders } from "@/lib/mutation-headers";

type WorkflowOption = {
  id: string;
  name: string;
};

type ParentOption = {
  id: string;
  title: string;
};

type FormRecord = {
  id: string;
  slug: string;
  title: string;
  status: string;
  version: number;
  sensitivity: string;
  updatedAt: string;
  workflow?: WorkflowOption | null;
};

export default function FormsManagerClient({
  forms,
  workflows,
  parentForms,
}: {
  forms: FormRecord[];
  workflows: WorkflowOption[];
  parentForms: ParentOption[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formState, setFormState] = useState({
    slug: "",
    title: "",
    sensitivity: "standard",
    workflowId: "",
    parentFormId: "",
  });
  const router = useRouter();

  const visibleForms = useMemo(
    () =>
      forms.filter((form) => {
        const matchesStatus = status === "all" || form.status === status;
        const matchesQuery =
          query.trim().length === 0 ||
          form.title.toLowerCase().includes(query.toLowerCase()) ||
          form.slug.toLowerCase().includes(query.toLowerCase());

        return matchesStatus && matchesQuery;
      }),
    [forms, query, status],
  );

  async function createForm() {
    const normalizedSlug = slugify(formState.slug);

    if (!formState.title.trim()) {
      setError("Add a form title before creating the form.");
      return;
    }

    if (!normalizedSlug) {
      setError("Add a slug using lowercase letters, numbers, and hyphens.");
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({
        slug: normalizedSlug,
        title: formState.title.trim(),
        sensitivity: formState.sensitivity,
        workflowId: formState.workflowId || null,
        parentFormId: formState.parentFormId || null,
        schema: {
          display: "form",
          components: [
            {
              type: "textfield",
              key: "requestTitle",
              label: "Request title",
              input: true,
            },
            {
              type: "button",
              action: "submit",
              label: "Submit",
              theme: "primary",
            },
          ],
        },
      }),
    });

    setPending(false);

    if (!response.ok) {
      const message = await getErrorMessage(response);
      setError(message);
      return;
    }

    const json = (await response.json()) as { form: { id: string } };
    setCreateOpen(false);
    setFormState({
      slug: "",
      title: "",
      sensitivity: "standard",
      workflowId: "",
      parentFormId: "",
    });
    setSlugTouched(false);
    router.push(`/admin/forms/${json.form.id}/builder`);
    router.refresh();
  }

  async function updateStatus(id: string, nextStatus: "published" | "archived" | "draft") {
    setPending(true);
    await fetch(`/api/forms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="bf-stack">
      <section className="bf-filter-bar">
        <div className="bf-filter-group">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or slug"
            className="bf-input"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="bf-select"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <button type="button" onClick={() => setCreateOpen(true)} className="bf-btn bf-btn-primary">
          Create form
        </button>
      </section>

      {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

      <section className="bf-list">
        {visibleForms.map((form) => (
          <article key={form.id} className="bf-list-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <p className="bf-eyebrow">{form.slug}</p>
                <h2 className="text-[30px] font-extrabold leading-none">{form.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={form.status} />
                  <StatusBadge status={form.sensitivity} />
                </div>
                <p className="bf-copy">
                  Version {form.version} | Workflow {form.workflow?.name ?? "Unassigned"}
                </p>
              </div>

              <div className="bf-action-row">
                <Link href={`/admin/forms/${form.id}/builder`} className="bf-btn bf-btn-primary bf-btn-segment">
                  Open builder
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    updateStatus(form.id, form.status === "published" ? "archived" : "published")
                  }
                  className="bf-btn bf-btn-segment disabled:opacity-60"
                >
                  {form.status === "published" ? "Archive" : "Publish"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="bf-panel w-full max-w-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bf-eyebrow">New form</p>
                <div className="bf-rule-sm mt-3" />
                <h2 className="mt-4 text-[32px] font-extrabold leading-none">Start with a fresh shell</h2>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="bf-btn">
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={formState.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setFormState((current) => ({
                    ...current,
                    title: nextTitle,
                    slug: slugTouched ? current.slug : slugify(nextTitle),
                  }));
                }}
                placeholder="Form title"
                className="bf-input"
              />
              <input
                value={formState.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setFormState((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }));
                }}
                placeholder="form-slug"
                className="bf-input"
              />
              <select
                value={formState.sensitivity}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, sensitivity: event.target.value }))
                }
                className="bf-select"
              >
                <option value="standard">Standard</option>
                <option value="pii">PII</option>
                <option value="sensitive">Sensitive</option>
              </select>
              <select
                value={formState.workflowId}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, workflowId: event.target.value }))
                }
                className="bf-select"
              >
                <option value="">No workflow yet</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
              <select
                value={formState.parentFormId}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, parentFormId: event.target.value }))
                }
                className="bf-select md:col-span-2"
              >
                <option value="">No parent form</option>
                {parentForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-xs text-[var(--muted-strong)]">
              Slugs use lowercase letters, numbers, and hyphens. Leave the workflow blank to attach one later.
            </p>

            <div className="mt-6 bf-action-row">
              <button
                type="button"
                onClick={createForm}
                disabled={pending}
                className="bf-btn bf-btn-primary disabled:opacity-60"
              >
                {pending ? "Creating..." : "Create and open builder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    if (payload.error?.message) return payload.error.message;
  } catch {
    return "The form could not be created. Try a different slug or workflow selection.";
  }

  return "The form could not be created. Try a different slug or workflow selection.";
}
