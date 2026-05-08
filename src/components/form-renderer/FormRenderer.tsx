"use client";

import type { ComponentProps, ComponentType } from "react";
import { Form } from "@formio/react/lib/components/Form";
import "./formio-renderer.css";

export type RenderableFormSchema = NonNullable<ComponentProps<typeof Form>["form"]>;
type FormData = Record<string, unknown>;
type FormSubmissionData = NonNullable<
  NonNullable<ComponentProps<typeof Form>["submission"]>["data"]
>;
const RenderForm = Form as unknown as ComponentType<{
  form: RenderableFormSchema;
  submission?: { data: FormSubmissionData };
  onSubmit: (submission: { data?: FormSubmissionData }) => Promise<void> | void;
}>;

type Props = {
  schema: RenderableFormSchema;
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void> | void;
};

export function FormRenderer({ schema, initialData, onSubmit }: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
      <RenderForm
        form={schema}
        submission={{ data: (initialData ?? {}) as FormSubmissionData }}
        onSubmit={(submission) => {
          return onSubmit((submission.data ?? {}) as FormData);
        }}
      />
    </div>
  );
}
