"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PrimitiveMark } from "@/components/ui/Bauhaus";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";
import { AllowedRolesField } from "@/app/admin/forms/AllowedRolesField";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/routing";
import { getStatusLabel } from "@/lib/ui";
import {
  parseFormTranslations,
  type FormTranslations,
  type TranslationReviewStatus,
} from "@/lib/form-translations";

const FormBuilder = dynamic(
  () => import("@/components/form-builder/FormBuilder").then((m) => ({ default: m.FormBuilder })),
  {
    ssr: false,
    loading: () => <div className="bf-panel p-8 text-sm text-[var(--muted-strong)]">Loading builder...</div>,
  },
);
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getMutationHeaders } from "@/lib/mutation-headers";
import {
  collectFormFieldSettings,
  type FormioSchema,
  updateFormFieldSettings,
} from "@/lib/formio-schema";

type BuilderForm = {
  id: string;
  title: string;
  slug: string;
  translations?: unknown;
  version: number;
  status: "draft" | "published" | "archived";
  sensitivity: "standard" | "pii" | "sensitive";
  workflowId?: string | null;
  allowedRoles: Array<{
    id: string;
    name: string;
    label: string | null;
  }>;
  schema: FormBuilderSchema;
};

type WorkflowOption = {
  id: string;
  name: string;
};

type RoleOption = {
  id: string;
  name: string;
  label: string | null;
};

export default function BuilderClient({
  form,
  workflows,
  availableRoles,
  locale,
  dictionary,
  translationAvailable,
}: {
  form: BuilderForm;
  workflows: WorkflowOption[];
  availableRoles: RoleOption[];
  locale: Locale;
  dictionary: Dictionary;
  translationAvailable: boolean;
}) {
  const [schema, setSchema] = useState(form.schema);
  const [title, setTitle] = useState(form.title);
  const [translations, setTranslations] = useState<FormTranslations>(() => parseFormTranslations(form.translations));
  const [slug, setSlug] = useState(form.slug);
  const [sensitivity, setSensitivity] = useState(form.sensitivity);
  const [workflowId, setWorkflowId] = useState(form.workflowId ?? "");
  const [allowedRoleNames, setAllowedRoleNames] = useState(
    form.allowedRoles.map((role) => role.name),
  );
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editingLocale, setEditingLocale] = useState<Locale>("de");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const router = useRouter();
  const englishTranslation = translations.en ?? {};
  const englishTitle = englishTranslation.title ?? title;
  const englishSchema = (englishTranslation.schema as FormBuilderSchema | undefined) ?? schema;
  const reviewStatus = englishTranslation.reviewStatus ?? "missing";
  const activeTitle = editingLocale === "de" ? title : englishTitle;
  const activeSchema = editingLocale === "de" ? schema : englishSchema;
  const fieldSettings = collectFormFieldSettings(activeSchema as FormioSchema);

  function showMessage(text: string, tone: "error" | "success") {
    setMessage(text);
    setMessageTone(tone);
  }

  async function getApiErrorMessage(response: Response, fallback: string) {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload.error?.message?.trim() || fallback;
    } catch {
      return fallback;
    }
  }

  async function save(status?: "draft" | "published" | "archived") {
    setSaving(true);
    setMessage(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch(`/api/forms/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-formflow-locale": locale, ...mutationHeaders },
      body: JSON.stringify({
        title,
        slug,
        sensitivity,
        workflowId: workflowId || null,
        allowedRoleNames,
        schema,
        translations: {
          ...translations,
          en: {
            ...translations.en,
            title: englishTitle,
            schema: englishSchema,
            reviewStatus: reviewStatus,
          },
        },
        status,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      showMessage(await getApiErrorMessage(response, dictionary.builder.saveFailed), "error");
      return;
    }

    showMessage(
      status === "published" ? dictionary.builder.formPublished : dictionary.builder.draftSaved,
      "success",
    );
    router.refresh();
  }

  async function generateDraftTranslation() {
    setSaving(true);
    setMessage(null);
    const mutationHeaders = await getMutationHeaders();

    const response = await fetch(`/api/forms/${form.id}/translate-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-formflow-locale": locale, ...mutationHeaders },
      body: JSON.stringify({}),
    });

    setSaving(false);

    if (!response.ok) {
      showMessage(dictionary.forms.translationUnavailable, "error");
      return;
    }

    const payload = (await response.json()) as {
      translation: {
        title?: string;
        schema?: FormBuilderSchema;
        reviewStatus?: TranslationReviewStatus;
        generatedAt?: string | null;
      };
    };

    setTranslations((current) => ({
      ...current,
      en: {
        ...current.en,
        ...payload.translation,
        schema: payload.translation.schema as FormioSchema | undefined,
      },
    }));
    setEditingLocale("en");
    showMessage(dictionary.forms.translationGenerated, "success");
  }

  function updateActiveSchema(nextSchema: FormBuilderSchema) {
    if (editingLocale === "de") {
      setSchema(nextSchema);
      return;
    }

    setTranslations((current) => ({
      ...current,
      en: {
        ...current.en,
        schema: nextSchema as unknown as FormioSchema,
      },
    }));
  }

  function updateActiveTitle(nextTitle: string) {
    if (editingLocale === "de") {
      setTitle(nextTitle);
      return;
    }

    setTranslations((current) => ({
      ...current,
      en: {
        ...current.en,
        title: nextTitle,
      },
    }));
  }

  function setTranslationReviewStatus(nextStatus: TranslationReviewStatus) {
    setTranslations((current) => ({
      ...current,
      en: {
        ...current.en,
        reviewStatus: nextStatus,
      },
    }));
  }

  function toggleAllowedRole(roleName: string) {
    setAllowedRoleNames((current) =>
      current.includes(roleName)
        ? current.filter((name) => name !== roleName)
        : [...current, roleName],
    );
  }

  return (
    <main className="bf-stack">
      <header className="bf-panel px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="bf-eyebrow">{dictionary.builder.pageEyebrow}</p>
            <div className="bf-rule mt-3" />
            <h1 className="mt-5 text-[clamp(36px,5vw,64px)] font-extrabold leading-[0.9]">
              {activeTitle}
              <span className="text-[var(--accent)]">.</span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={form.status} label={getStatusLabel(form.status, locale)} />
              <StatusBadge status={sensitivity} label={getStatusLabel(sensitivity, locale)} />
              <span className="bf-pill">Version {form.version}</span>
              {editingLocale === "en" ? (
                <span className="bf-pill">
                  {dictionary.builder.reviewStatus}: {reviewStatus}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-start gap-5 lg:items-end">
            <div className="bf-primitive-row">
              <PrimitiveMark shape="circle" color="var(--haus-teal)" size={34} />
              <PrimitiveMark shape="square" color="var(--haus-red)" size={34} />
              <PrimitiveMark shape="triangle" color="var(--haus-yellow)" size={34} />
            </div>
            <div className="bf-action-row">
              <Link href={`${localizePath(locale, `/forms/${slug}`)}?preview=1`} className="bf-btn bf-btn-segment">
                Preview
              </Link>
              <button onClick={() => save("draft")} disabled={saving} type="button" className="bf-btn bf-btn-segment disabled:opacity-60">
                {dictionary.common.saveDraft}
              </button>
              <button
                onClick={generateDraftTranslation}
                disabled={saving || !translationAvailable}
                type="button"
                title={translationAvailable ? undefined : dictionary.forms.translationUnavailable}
                className="bf-btn bf-btn-segment disabled:opacity-60"
              >
                {dictionary.forms.generateDraftTranslation}
              </button>
              <button
                onClick={() => save("published")}
                disabled={saving}
                type="button"
                className="bf-btn bf-btn-primary bf-btn-segment disabled:opacity-60"
              >
                {dictionary.common.publish}
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <div className={`mt-4 bf-alert ${messageTone === "error" ? "bf-alert-error" : "bf-alert-success"}`}>
            {message}
          </div>
        ) : null}
      </header>

      <section className="bf-panel p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="bf-eyebrow">{dictionary.builder.formSettings}</p>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              {dictionary.builder.metadataHelp}
            </p>
          </div>
          <button type="button" onClick={() => setPreview((current) => !current)} className="bf-btn">
            {preview ? dictionary.builder.backToBuilder : dictionary.builder.previewSchema}
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <div className="flex gap-2 xl:col-span-4">
            <button
              type="button"
              onClick={() => setEditingLocale("de")}
              className={`bf-btn ${editingLocale === "de" ? "bf-btn-primary" : ""}`}
            >
              {dictionary.forms.german}
            </button>
            <button
              type="button"
              onClick={() => setEditingLocale("en")}
              className={`bf-btn ${editingLocale === "en" ? "bf-btn-primary" : ""}`}
            >
              {dictionary.forms.english}
            </button>
          </div>
          <input value={activeTitle} onChange={(event) => updateActiveTitle(event.target.value)} placeholder="Form title" className="bf-input" />
          <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="form-slug" className="bf-input" />
          <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as BuilderForm["sensitivity"])} className="bf-select">
            <option value="standard">{dictionary.adminForms.standard}</option>
            <option value="pii">{dictionary.adminForms.pii}</option>
            <option value="sensitive">{dictionary.adminForms.sensitive}</option>
          </select>
          <select value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} className="bf-select">
            <option value="">{dictionary.builder.noWorkflowAssigned}</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
          <div className="xl:col-span-4">
            <AllowedRolesField
              roles={availableRoles}
              selectedRoleNames={allowedRoleNames}
              onToggleRole={toggleAllowedRole}
              title={dictionary.adminForms.allowedRoles}
              description={dictionary.adminForms.allowedRolesHelp}
              allUsersLabel={dictionary.adminForms.allUsers}
              noRolesLabel={dictionary.adminForms.noRolesAvailable}
            />
          </div>
          {editingLocale === "en" ? (
            <select
              value={reviewStatus}
              onChange={(event) => setTranslationReviewStatus(event.target.value as TranslationReviewStatus)}
              className="bf-select xl:col-span-4"
            >
              <option value="missing">missing</option>
              <option value="needs_review">needs_review</option>
              <option value="reviewed">reviewed</option>
            </select>
          ) : null}
        </div>

        <div className="bf-panel-muted mt-4 p-4">
          <p className="bf-kicker">{dictionary.builder.fieldAccessTips}</p>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted-strong)] lg:grid-cols-2">
            <p>{dictionary.builder.fieldAccessTipsA}</p>
            <p>{dictionary.builder.fieldAccessTipsB}</p>
          </div>
        </div>

        {fieldSettings.length > 0 ? (
          <div className="bf-panel-muted mt-4 p-4">
            <p className="bf-kicker">{dictionary.builder.fieldAccessSettings}</p>
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
                            updateActiveSchema(
                              updateFormFieldSettings(activeSchema as FormioSchema, field.key, {
                                sensitive: event.target.checked,
                              }) as FormBuilderSchema,
                            )
                          }
                        />
                        {dictionary.builder.encryptField}
                      </label>
                      <label className="grid gap-2 text-sm text-[var(--ink)]">
                        <span className="bf-kicker">{dictionary.builder.readRoles}</span>
                        <input
                          value={field.readRoles.join(", ")}
                          onChange={(event) =>
                            updateActiveSchema(
                              updateFormFieldSettings(activeSchema as FormioSchema, field.key, {
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
                            updateActiveSchema(
                              updateFormFieldSettings(activeSchema as FormioSchema, field.key, {
                                ownerCanRead: event.target.checked,
                              }) as FormBuilderSchema,
                            )
                          }
                        />
                        {dictionary.builder.submitterCanRead}
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
          <p className="bf-eyebrow">{dictionary.builder.builderCanvas}</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            {dictionary.builder.builderCanvasHelp}
          </p>
        </div>

        {preview ? (
          <pre className="min-h-[72vh] overflow-x-auto border border-[var(--line-strong)] bg-[var(--ink)] p-5 font-mono text-sm leading-7 text-white">
            {JSON.stringify(activeSchema, null, 2)}
          </pre>
        ) : (
          <FormBuilder locale={editingLocale} schema={activeSchema} onChange={updateActiveSchema} />
        )}
      </section>
    </main>
  );
}
