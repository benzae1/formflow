"use client";

import { Form } from "@formio/react/lib/components/Form";
import "./formio-renderer.css";

type FormSchema = Record<string, unknown>;
type FormData = Record<string, unknown>;

type Props = {
  schema: FormSchema;
  initialData?: FormData;
  onSubmit: (data: FormData) => void;
};

export function FormRenderer({ schema, initialData, onSubmit }: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
      <Form
        form={schema}
        submission={{ data: initialData ?? {} }}
        onSubmit={(submission) => {
          onSubmit((submission.data ?? {}) as FormData);
        }}
      />
    </div>
  );
}
