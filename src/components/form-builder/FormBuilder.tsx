"use client";

import { useEffect, useRef, useState } from "react";
import { FormBuilder as FormioBuilder } from "@formio/js";
import type { Form as FormioCoreForm } from "@formio/core";
import "@formio/js/dist/formio.full.min.css";
import "./formio-builder.css";
import type { Locale } from "@/lib/i18n/config";

export type FormBuilderSchema = FormioCoreForm & Record<string, unknown>;

type Props = {
  locale: Locale;
  schema: FormBuilderSchema;
  onChange: (schema: FormBuilderSchema) => void;
};

function serializeSchema(schema: FormBuilderSchema) {
  return JSON.stringify(schema);
}

function cloneSchema(schema: FormBuilderSchema): FormBuilderSchema {
  return JSON.parse(JSON.stringify(schema));
}

function normalizeBuilderSchema(schema: FormBuilderSchema): FormBuilderSchema {
  const nextSchema = cloneSchema(schema);
  const display =
    nextSchema.display === "wizard" || nextSchema.display === "pdf" || nextSchema.display === "form"
      ? nextSchema.display
      : "form";

  return {
    ...nextSchema,
    display,
    components: Array.isArray(nextSchema.components) ? nextSchema.components : [],
  } as FormBuilderSchema;
}

function getBuilderForm(builder: InstanceType<typeof FormioBuilder>) {
  return builder.form as FormBuilderSchema;
}

export function FormBuilder({ locale, schema, onChange }: Props) {
  const initialSchema = normalizeBuilderSchema(schema);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<InstanceType<typeof FormioBuilder> | null>(null);
  const latestSchemaRef = useRef(initialSchema);
  const latestOnChangeRef = useRef(onChange);
  const lastBuilderSchemaRef = useRef(serializeSchema(initialSchema));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  // Bootstrap 5 collapse data-API never auto-initialises on dynamically rendered
  // formio DOM nodes. Wire up a delegated listener on the container instead.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleCollapseClick(event: MouseEvent) {
      const btn = (event.target as Element).closest<HTMLElement>('[data-bs-toggle="collapse"]');
      if (!btn) return;
      const targetSelector = btn.getAttribute("data-bs-target");
      if (!targetSelector) return;
      const panel = container!.querySelector<HTMLElement>(targetSelector);
      if (!panel) return;
      const isOpen = panel.classList.contains("show");
      panel.classList.toggle("show", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
    }

    container.addEventListener("click", handleCollapseClick);
    return () => container.removeEventListener("click", handleCollapseClick);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    setReady(false);
    setError(null);
    mount.replaceChildren();

    const nextSchema = normalizeBuilderSchema(latestSchemaRef.current);
    const builder = new FormioBuilder(mount, nextSchema, { language: locale });

    async function initBuilder() {
      try {
        await builder.ready;

        if (cancelled) {
          builder.instance?.destroy?.(true);
          return;
        }

        const instance = builder.instance;
        const emitSchemaChange = () => {
          const updatedSchema = cloneSchema(getBuilderForm(builder));
          latestSchemaRef.current = updatedSchema;
          lastBuilderSchemaRef.current = serializeSchema(updatedSchema);
          latestOnChangeRef.current(updatedSchema);
        };

        instance?.on?.("saveComponent", emitSchemaChange);
        instance?.on?.("updateComponent", emitSchemaChange);
        instance?.on?.("removeComponent", emitSchemaChange);
        instance?.on?.("addComponent", emitSchemaChange);
        instance?.on?.("pdfUploaded", emitSchemaChange);
        instance?.on?.("setDisplay", emitSchemaChange);

        builderRef.current = builder;
        lastBuilderSchemaRef.current = serializeSchema(getBuilderForm(builder));
        setReady(true);
      } catch (caughtError) {
        if (cancelled) return;
        console.error("Failed to initialise Form.io builder", caughtError);
        setError(caughtError instanceof Error ? caughtError.message : "The Form.io builder could not be initialised.");
      }
    }

    void initBuilder();

    return () => {
      cancelled = true;
      setReady(false);
      if (builderRef.current === builder) {
        builderRef.current = null;
      }
      builder.instance?.destroy?.(true);
      mount.replaceChildren();
    };
  }, [locale]);

  useEffect(() => {
    const nextSchema = normalizeBuilderSchema(schema);
    const nextSerializedSchema = serializeSchema(nextSchema);
    latestSchemaRef.current = nextSchema;

    if (nextSerializedSchema === lastBuilderSchemaRef.current) return;

    const builder = builderRef.current;
    if (!builder) {
      lastBuilderSchemaRef.current = nextSerializedSchema;
      return;
    }

    lastBuilderSchemaRef.current = nextSerializedSchema;
    void builder.setForm(cloneSchema(nextSchema));
  }, [schema]);

  return (
    <div ref={containerRef} className="form-builder-frame bf-panel p-3 md:p-5">
      {!ready && !error ? (
        <div className="bf-panel-muted mb-3 p-4 text-sm text-[var(--muted-strong)]">
          Loading builder...
        </div>
      ) : null}
      {error ? (
        <div className="bf-alert bf-alert-error mb-3">
          {error}
        </div>
      ) : null}
      <div className="form-builder-mount overflow-x-auto" ref={mountRef}>
      </div>
    </div>
  );
}
