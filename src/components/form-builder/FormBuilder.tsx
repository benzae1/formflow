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

  useEffect(() => {
    const nextSchema = serializeSchema(schema);

    if (nextSchema === lastBuilderSchemaRef.current) {
      return;
    }

    setInitialBuilderSchema(schema);
  }, [schema]);

  return (
    <div className="form-builder-frame bf-panel p-3 md:p-5">
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
