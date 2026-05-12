"use client";

import type { ComponentProps, ComponentType } from "react";
import { Form } from "@formio/react/lib/components/Form";
import "./formio-renderer.css";
import type { Locale } from "@/lib/i18n/config";

export type RenderableFormSchema = NonNullable<ComponentProps<typeof Form>["form"]>;
type FormData = Record<string, unknown>;
type FormSubmissionData = NonNullable<
  NonNullable<ComponentProps<typeof Form>["submission"]>["data"]
>;
const RenderForm = Form as unknown as ComponentType<{
  form: RenderableFormSchema;
  options?: Record<string, unknown>;
  submission?: { data: FormSubmissionData };
  onSubmit: (submission: { data?: FormSubmissionData }) => Promise<void> | void;
  onChange?: (submission: { data?: FormSubmissionData }) => void;
}>;

type Props = {
  locale: Locale;
  schema: RenderableFormSchema;
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void> | void;
  onChange?: (data: FormData) => void;
};

export function FormRenderer({ locale, schema, initialData, onSubmit, onChange }: Props) {
  return (
    <div className="form-renderer-frame bf-panel p-6">
      <RenderForm
        form={schema}
        options={{
          language: locale,
          i18n: {
            de: {},
            en: {},
          },
        } as never}
        submission={{ data: (initialData ?? {}) as FormSubmissionData }}
        onChange={(submission) => {
          onChange?.((submission.data ?? {}) as FormData);
        }}
        onSubmit={(submission) => {
          return onSubmit((submission.data ?? {}) as FormData);
        }}
      />
    </div>
  );
}
