"use client";

import { FormBuilder as FormioBuilder } from "@formio/react/lib/components/FormBuilder";
import "./formio-builder.css";

type FormSchema = Record<string, unknown>;

type Props = {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
};

export function FormBuilder({ schema, onChange }: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <FormioBuilder
        initialForm={schema}
        onChange={(updatedSchema: FormSchema) => {
          onChange(updatedSchema);
        }}
      />
    </div>
  );
}
