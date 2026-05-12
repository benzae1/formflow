"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { summarizeWorkflow } from "@/lib/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mutationHeaders } from "@/lib/mutation-headers";

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
        assignTo: { type: "role", value: "approver" },
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
      headers: { "Content-Type": "application/json", ...mutationHeaders },
      body: JSON.stringify({ name, definition }),
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
      <section className="bf-panel p-5">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <p className="bf-eyebrow">Workflow library</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">Definitions</h2>
          </div>
          <button type="button" onClick={newWorkflow} className="bf-btn bf-btn-primary">
            New workflow
          </button>
        </div>

        <div className="mt-4 bf-list">
          {workflows.map((workflow) => (
            <button
              key={workflow.id}
              type="button"
              onClick={() => chooseWorkflow(workflow.id)}
              className="w-full border px-4 py-4 text-left"
              style={{
                borderColor: selectedId === workflow.id ? "var(--accent)" : "var(--line-strong)",
                background: selectedId === workflow.id ? "var(--canvas-soft)" : "var(--panel)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold">{workflow.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    Version {workflow.version} | {workflow.forms.length} attached forms
                  </p>
                </div>
                <StatusBadge status="approval" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="bf-panel p-6">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="bf-eyebrow">Editor</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">
              {selectedId ? "Edit workflow" : "Create workflow"}
            </h2>
          </div>
          <button type="button" onClick={save} disabled={pending} className="bf-btn bf-btn-primary disabled:opacity-60">
            {pending ? "Saving..." : "Save workflow"}
          </button>
        </div>

        <div className="mt-5 bf-stack">
          <input value={name} onChange={(event) => setName(event.target.value)} className="bf-input" placeholder="Workflow name" />

          {error ? <div className="bf-alert bf-alert-error">{error}</div> : null}

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <textarea
              value={definitionText}
              onChange={(event) => setDefinitionText(event.target.value)}
              rows={24}
              className="w-full border border-[var(--line-strong)] bg-[var(--ink)] px-4 py-4 font-mono text-sm leading-7 text-white outline-none"
            />

            <div className="bf-stack">
              <div className="bf-panel-muted p-4">
                <p className="bf-kicker">Stage summary</p>
                <div className="mt-4 bf-list">
                  {stageSummary.map((stage) => (
                    <article key={stage.id} className="bf-panel px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{stage.name}</p>
                          <p className="mt-1 text-sm text-[var(--muted-strong)]">{stage.description}</p>
                        </div>
                        <StatusBadge status={stage.type} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {selectedWorkflow ? (
                <div className="bf-panel-muted p-4">
                  <p className="bf-kicker">Attached forms</p>
                  <div className="mt-3 bf-list">
                    {selectedWorkflow.forms.length === 0 ? (
                      <p className="text-sm text-[var(--muted-strong)]">
                        No forms currently reference this workflow.
                      </p>
                    ) : (
                      selectedWorkflow.forms.map((form) => (
                        <p key={form.id} className="bf-panel px-3 py-2 text-sm">
                          {form.title}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
