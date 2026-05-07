"use client";

import { FormRenderer } from "@/components/form-renderer/FormRenderer";

type PublicForm = {
  id: string;
  title: string;
  schema: Record<string, unknown>;
};

export default function SubmitFormClient({ form }: { form: PublicForm }) {
  async function submit(data: Record<string, unknown>) {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: form.id,
        data,
        saveAsDraft: false,
      }),
    });

    if (!res.ok) {
      alert("Submission failed.");
      return;
    }

    const json = (await res.json()) as {
      submission: { id: string };
    };

    window.location.href = `/submissions/${json.submission.id}`;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">
          Public form
        </p>
        <h1 className="text-3xl font-semibold text-black">{form.title}</h1>
      </header>

      <FormRenderer schema={form.schema} onSubmit={submit} />
    </main>
  );
}
