"use client";

import type { ComponentProps } from "react";
import { FormBuilder as FormioBuilder } from "@formio/react/lib/components/FormBuilder";
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

export function FormBuilder({ locale, schema, onChange }: Props) {
  return (
    <div className="form-builder-frame bf-panel p-3 md:p-5">
      <div className="overflow-x-auto">
        <FormioBuilder
          initialForm={schema}
          options={{ language: locale } as never}
          onChange={(updatedSchema: FormBuilderSchema) => {
            onChange(updatedSchema);
          }}
        />
      </div>
    </div>
  );
}
