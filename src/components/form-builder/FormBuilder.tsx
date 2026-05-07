"use client";

import type { ComponentProps } from "react";
import { FormBuilder as FormioBuilder } from "@formio/react/lib/components/FormBuilder";
import "./formio-builder.css";

export type FormBuilderSchema = NonNullable<
  ComponentProps<typeof FormioBuilder>["initialForm"]
>;

type Props = {
  schema: FormBuilderSchema;
  onChange: (schema: FormBuilderSchema) => void;
};

export function FormBuilder({ schema, onChange }: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <FormioBuilder
        initialForm={schema}
        onChange={(updatedSchema: FormBuilderSchema) => {
          onChange(updatedSchema);
        }}
      />
    </div>
  );
}
