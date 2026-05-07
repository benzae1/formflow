"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { summarizeWorkflow } from "@/lib/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";

type WorkflowRecord = {
  id: string;
  name: string;
  version: number;
  definition: unknown;
  forms: Array<{ id: string; title: string }>;
};

function emptyDefinition() {
  return JSON.stringify(
    [
      {
        id: "approval",
        name: "Approval",
        type: "approval",
        assignTo: {
          type: "role",
          value: "approver",
        },
        onApprove: "close",
        onReject: "close",
      },
    ],
    null,
    2,
  );
}

export default function WorkflowsManagerClient({
  workflows,
}: {
  workflows: WorkflowRecord[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(workflows[0]?.id ?? null);
  const [name, setName] = useState(workflows[0]?.name ?? "");
  const [definitionText, setDefinitionText] = useState(
    workflows[0] ? JSON.stringify(workflows[0].definition, null, 2) : emptyDefinition(),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedId) ?? null;

  const stageSummary = useMemo(() => {
    try {
      return summarizeWorkflow(JSON.parse(definitionText));
    } catch {
      return [];
    }
  }, [definitionText]);

  function chooseWorkflow(id: string) {
    const workflow = workflows.find((item) => item.id === id);
    if (!workflow) return;

    setSelectedId(workflow.id);
    setName(workflow.name);
    setDefinitionText(JSON.stringify(workflow.definition, null, 2));
    setError(null);
  }

  async function save() {
    setPending(true);
    setError(null);

    let definition;
    try {
      definition = JSON.parse(definitionText);
    } catch {
      setPending(false);
      setError("Definition must be valid JSON.");
      return;
    }

    const response = await fetch(selectedId ? `/api/workflows/${selectedId}` : "/api/workflows", {
      method: selectedId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        definition,
      }),
    });

    setPending(false);

    if (!response.ok) {
      setError("Workflow could not be saved. Check the definition shape.");
      return;
    }

    router.refresh();
  }

  function newWorkflow() {
    setSelectedId(null);
    setName("New workflow");
    setDefinitionText(emptyDefinition());
    setError(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-3 rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Workflow library
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Definitions</h2>
          </div>
          <button
            type="button"
            onClick={newWorkflow}
            className="rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            New workflow
          </button>
        </div>

        {workflows.map((workflow) => (
          <button
            key={workflow.id}
            type="button"
            onClick={() => chooseWorkflow(workflow.id)}
            className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
              selectedId === workflow.id
                ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                : "border-black/10 bg-white/85 hover:border-black/20"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{workflow.name}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Version {workflow.version} • {workflow.forms.length} attached forms
                </p>
              </div>
              <StatusBadge status="approval" />
            </div>
          </button>
        ))}
      </section>

      <section className="space-y-4 rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Editor
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {selectedId ? "Edit workflow" : "Create workflow"}
            </h2>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save workflow"}
          </button>
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
          placeholder="Workflow name"
        />

        {error ? (
          <div className="rounded-[20px] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <textarea
            value={definitionText}
            onChange={(event) => setDefinitionText(event.target.value)}
            rows={24}
            className="w-full rounded-[24px] border border-black/10 bg-[var(--ink)] px-4 py-4 font-mono text-sm leading-7 text-white outline-none transition focus:border-[var(--brand)]"
          />

          <div className="space-y-3">
            <div className="rounded-[24px] border border-black/10 bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                Stage summary
              </p>
              <div className="mt-4 space-y-3">
                {stageSummary.map((stage) => (
                  <article
                    key={stage.id}
                    className="rounded-[20px] border border-black/10 bg-[var(--canvas)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{stage.name}</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                          {stage.description}
                        </p>
                      </div>
                      <StatusBadge status={stage.type} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {selectedWorkflow ? (
              <div className="rounded-[24px] border border-black/10 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                  Attached forms
                </p>
                <div className="mt-3 space-y-2">
                  {selectedWorkflow.forms.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      No forms currently reference this workflow.
                    </p>
                  ) : (
                    selectedWorkflow.forms.map((form) => (
                      <p key={form.id} className="rounded-2xl bg-[var(--canvas)] px-3 py-2 text-sm">
                        {form.title}
                      </p>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
