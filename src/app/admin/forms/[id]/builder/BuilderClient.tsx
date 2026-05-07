"use client";

import { useState } from "react";
import { FormBuilder } from "@/components/form-builder/FormBuilder";

type BuilderForm = {
  id: string;
  title: string;
  version: number;
  schema: Record<string, unknown>;
};

export default function BuilderClient({ form }: { form: BuilderForm }) {
  const [schema, setSchema] = useState(form.schema);
  const [saving, setSaving] = useState(false);

  async function save(status?: "draft" | "published") {
    setSaving(true);

    try {
      await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema,
          status,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6 p-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">{form.title}</h1>
          <p className="text-sm text-neutral-500">Version {form.version}</p>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => save("draft")}
            disabled={saving}
            type="button"
          >
            Save draft
          </button>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => save("published")}
            disabled={saving}
            type="button"
          >
            Publish
          </button>
        </div>
      </header>

      <FormBuilder schema={schema} onChange={setSchema} />
    </main>
  );
}
