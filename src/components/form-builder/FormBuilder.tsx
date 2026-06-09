"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { FormBuilder as FormioBuilder } from "@formio/react/lib/components/FormBuilder";
import "@formio/js/dist/formio.full.min.css";
import "./formio-builder.css";
import type { Locale } from "@/lib/i18n/config";

export type FormBuilderSchema = NonNullable<
  ComponentProps<typeof FormioBuilder>["initialForm"]
>;

type Props = {
  locale: Locale;
  schema: FormBuilderSchema;
  onChange: (schema: FormBuilderSchema) => void;
};

function serializeSchema(schema: FormBuilderSchema) {
  return JSON.stringify(schema);
}

export function FormBuilder({ locale, schema, onChange }: Props) {
  const [initialBuilderSchema, setInitialBuilderSchema] = useState(schema);
  const lastBuilderSchemaRef = useRef(serializeSchema(schema));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextSchema = serializeSchema(schema);
    if (nextSchema === lastBuilderSchemaRef.current) return;
    setInitialBuilderSchema(schema);
  }, [schema]);

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

  return (
    <div ref={containerRef} className="form-builder-frame bf-panel p-3 md:p-5">
      <div className="overflow-x-auto">
        <FormioBuilder
          initialForm={initialBuilderSchema}
          options={{ language: locale } as never}
          onBuilderReady={(builder) => {
            lastBuilderSchemaRef.current = serializeSchema(builder.form as FormBuilderSchema);
          }}
          onChange={(updatedSchema: FormBuilderSchema) => {
            lastBuilderSchemaRef.current = serializeSchema(updatedSchema);
            onChange(updatedSchema);
          }}
        />
      </div>
    </div>
  );
}
