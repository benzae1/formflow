"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AllowedRolesField,
  getAllowedRolesSummary,
} from "@/app/admin/forms/AllowedRolesField";
import { getMutationHeaders } from "@/lib/mutation-headers";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/routing";
import { resolveFormTitle } from "@/lib/form-translations";
import { getStatusLabel } from "@/lib/ui";

type WorkflowOption = {
  id: string;
  name: string;
};

type ParentOption = {
  id: string;
  title: string;
};

type RoleOption = {
  id: string;
  name: string;
  label: string | null;
};

type FormRecord = {
  id: string;
  slug: string;
  title: string;
  translations?: Record<string, unknown> | null;
  status: string;
  version: number;
  sensitivity: string;
  updatedAt: string;
  workflow?: WorkflowOption | null;
  allowedRoles: RoleOption[];
};

export default function FormsManagerClient({
  forms,
  workflows,
  parentForms,
  availableRoles,
  locale,
  dictionary,
}: {
  forms: FormRecord[];
  workflows: WorkflowOption[];
  parentForms: ParentOption[];
  availableRoles: RoleOption[];
  locale: Locale;
  dictionary: Dictionary;
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
    allowedRoleNames: [] as string[],
  });
  const router = useRouter();

  const visibleForms = useMemo(
    () =>
      forms.filter((form) => {
        const matchesStatus = status === "all" || form.status === status;
        const matchesQuery =
          query.trim().length === 0 ||
          resolveFormTitle(form, locale).toLowerCase().includes(query.toLowerCase()) ||
          form.title.toLowerCase().includes(query.toLowerCase()) ||
          form.slug.toLowerCase().includes(query.toLowerCase());

        return matchesStatus && matchesQuery;
      }),
    [forms, locale, query, status],
  );

  async function createForm() {
    const normalizedSlug = slugify(formState.slug);

    if (!formState.title.trim()) {
      setError(dictionary.adminForms.titleRequired);
      return;
    }

    if (!normalizedSlug) {
      setError(dictionary.adminForms.slugRequired);
      return;
    }

    setPending(true);
    setError(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch("/api/forms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-formflow-locale": locale,
        ...mutationHeaders,
      },
      body: JSON.stringify({
        slug: normalizedSlug,
        title: formState.title.trim(),
        sensitivity: formState.sensitivity,
        workflowId: formState.workflowId || null,
        parentFormId: formState.parentFormId || null,
        allowedRoleNames: formState.allowedRoleNames,
        schema: {
          display: "form",
          components: [
            {
              type: "textfield",
              key: "requestTitle",
              label: dictionary.adminForms.defaultTitle,
              input: true,
            },
            {
              type: "button",
              action: "submit",
              label: dictionary.adminForms.defaultSubmit,
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
      allowedRoleNames: [],
    });
    setSlugTouched(false);
    router.push(localizePath(locale, `/admin/forms/${json.form.id}/builder`));
    router.refresh();
  }

  async function updateStatus(id: string, nextStatus: "published" | "archived" | "draft") {
    setPending(true);
    const mutationHeaders = await getMutationHeaders();
    await fetch(`/api/forms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-formflow-locale": locale, ...mutationHeaders },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(false);
    router.refresh();
  }

  function toggleAllowedRole(roleName: string) {
    setFormState((current) => ({
      ...current,
      allowedRoleNames: current.allowedRoleNames.includes(roleName)
        ? current.allowedRoleNames.filter((name) => name !== roleName)
        : [...current.allowedRoleNames, roleName],
    }));
  }

  return (
    <div className="bf-stack">
      <section className="bf-filter-bar">
        <div className="bf-filter-group">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dictionary.adminForms.searchPlaceholder}
            className="bf-input"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="bf-select"
          >
            <option value="all">{dictionary.submissions.allStatuses}</option>
            <option value="draft">{dictionary.common.draft}</option>
            <option value="published">{dictionary.common.published}</option>
            <option value="archived">{dictionary.common.archived}</option>
          </select>
        </div>

        <button type="button" onClick={() => setCreateOpen(true)} className="bf-btn bf-btn-primary">
          {dictionary.adminForms.createForm}
        </button>
      </section>

      {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

      <section className="bf-list">
        {visibleForms.map((form) => (
          <article key={form.id} className="bf-list-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <p className="bf-eyebrow">{form.slug}</p>
                <h2 className="text-[30px] font-extrabold leading-none">{resolveFormTitle(form, locale)}</h2>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={form.status} label={getStatusLabel(form.status, locale)} />
                  <StatusBadge status={form.sensitivity} label={getStatusLabel(form.sensitivity, locale)} />
                </div>
                <p className="bf-copy">
                  {dictionary.adminForms.version} {form.version} | {dictionary.adminForms.workflow} {form.workflow?.name ?? dictionary.adminForms.unassigned}
                </p>
                <p className="bf-copy">
                  {dictionary.adminForms.allowedRoles}{" "}
                  {getAllowedRolesSummary(form.allowedRoles, dictionary.adminForms.allUsers)}
                </p>
              </div>

              <div className="bf-action-row">
                <Link href={localizePath(locale, `/admin/forms/${form.id}/builder`)} className="bf-btn bf-btn-primary bf-btn-segment">
                  {dictionary.adminForms.openBuilder}
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    updateStatus(form.id, form.status === "published" ? "archived" : "published")
                  }
                  className="bf-btn bf-btn-segment disabled:opacity-60"
                >
                  {form.status === "published" ? dictionary.common.archived : dictionary.common.publish}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 px-4 py-6">
          <div className="flex min-h-full items-start justify-center sm:items-center">
            <div className="bf-panel max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="bf-eyebrow">{dictionary.adminForms.newForm}</p>
                  <div className="bf-rule-sm mt-3" />
                  <h2 className="mt-4 text-[32px] font-extrabold leading-none">{dictionary.adminForms.freshShell}</h2>
                </div>
                <button type="button" onClick={() => setCreateOpen(false)} className="bf-btn">
                  {dictionary.common.close}
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
                  placeholder={dictionary.adminForms.formTitle}
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
                  <option value="standard">{dictionary.adminForms.standard}</option>
                  <option value="pii">{dictionary.adminForms.pii}</option>
                  <option value="sensitive">{dictionary.adminForms.sensitive}</option>
                </select>
                <select
                  value={formState.workflowId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, workflowId: event.target.value }))
                  }
                  className="bf-select"
                >
                  <option value="">{dictionary.adminForms.noWorkflowYet}</option>
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
                  <option value="">{dictionary.adminForms.noParentForm}</option>
                  {parentForms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.title}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <AllowedRolesField
                    roles={availableRoles}
                    selectedRoleNames={formState.allowedRoleNames}
                    onToggleRole={toggleAllowedRole}
                    title={dictionary.adminForms.allowedRoles}
                    description={dictionary.adminForms.allowedRolesHelp}
                    allUsersLabel={dictionary.adminForms.allUsers}
                    noRolesLabel={dictionary.adminForms.noRolesAvailable}
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-[var(--muted-strong)]">
                {dictionary.adminForms.slugHelp}
              </p>

              <div className="mt-6 bf-action-row">
                <button
                  type="button"
                  onClick={createForm}
                  disabled={pending}
                  className="bf-btn bf-btn-primary disabled:opacity-60"
                >
                  {pending ? dictionary.adminForms.creating : dictionary.adminForms.createAndOpenBuilder}
                </button>
              </div>
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
