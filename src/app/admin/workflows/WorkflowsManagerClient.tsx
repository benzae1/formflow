"use client";

import { type ReactNode, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodIssue } from "zod";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Locale } from "@/lib/i18n/config";
import { getMutationHeaders } from "@/lib/mutation-headers";
import { createWorkflowSchema } from "@/lib/validation/workflows";
import type { WorkflowStage, RoutingTarget } from "@/domain/workflow";

// ─── external types ───────────────────────────────────────────────────────────

type WorkflowRecord = {
  id: string;
  name: string;
  version: number;
  definition: unknown;
  forms: Array<{ id: string; title: string }>;
};

type RoleOption = { name: string; label: string | null };
type FormOption = { id: string; title: string };

// ─── internal stage row (adds stable React key) ───────────────────────────────

type StageRow = WorkflowStage & { _key: string };

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function stageToRow(stage: WorkflowStage): StageRow {
  return { ...stage, _key: makeKey() };
}

function newStageRow(type: WorkflowStage["type"]): StageRow {
  const id = `stage-${Date.now()}`;
  const base: StageRow = { id, name: "", type, _key: makeKey() };
  if (type === "approval") {
    return { ...base, assignTo: { type: "role", value: "" }, onApprove: "next-stage", onReject: "close" };
  }
  if (type === "notification") {
    return { ...base, assignTo: { type: "role", value: "" } };
  }
  if (type === "trigger-form") {
    return { ...base, childFormId: "" };
  }
  return { ...base, conditions: [{ expression: "" }] };
}

function parseDefinition(raw: unknown): StageRow[] {
  if (!Array.isArray(raw)) return [];
  return (raw as WorkflowStage[]).map(stageToRow);
}

function stripKey(row: StageRow): WorkflowStage {
  const { _key, ...stage } = row;
  void _key;
  return stage;
}

function normalizeTargets(assignTo: WorkflowStage["assignTo"]): RoutingTarget[] {
  if (!assignTo) return [];
  return Array.isArray(assignTo) ? assignTo : [assignTo];
}

function formatIssues(issues: ZodIssue[]): string[] {
  return issues.map((issue) => {
    const path = issue.path;
    if (path.length === 0) return issue.message;
    const [first, ...rest] = path;
    if (first === "definition" && typeof path[1] === "number") {
      const prefix = `Stage ${(path[1] as number) + 1}`;
      const field = rest.slice(1).length > 0 ? ` – ${rest.slice(1).join(".")}` : "";
      return `${prefix}${field}: ${issue.message}`;
    }
    return `${path.join(".")}: ${issue.message}`;
  });
}

// ─── RoutingTargetEditor ──────────────────────────────────────────────────────

const ORG_OPTIONS: Array<{ value: "submitter.manager" | "submitter.skip-level" | "department.head"; label: string }> = [
  { value: "submitter.manager", label: "Submitter's Manager" },
  { value: "submitter.skip-level", label: "Skip-level Manager" },
  { value: "department.head", label: "Department Head" },
];

function RoutingTargetEditor({
  id: editorId,
  targets,
  onChange,
  roles,
  locale,
}: {
  id: string;
  targets: RoutingTarget[];
  onChange: (targets: RoutingTarget[]) => void;
  roles: RoleOption[];
  locale: Locale;
}) {
  const isDE = locale === "de";

  function update(index: number, target: RoutingTarget) {
    const next = [...targets];
    next[index] = target;
    onChange(next);
  }

  function changeType(index: number, type: RoutingTarget["type"]) {
    const defaults: Record<string, RoutingTarget> = {
      role: { type: "role", value: "" },
      org: { type: "org", value: "submitter.manager" },
      user: { type: "user", value: "" },
      group: { type: "group", value: "" },
    };
    update(index, defaults[type] as RoutingTarget);
  }

  function remove(index: number) {
    onChange(targets.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...targets, { type: "role", value: "" }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {targets.map((target, index) => (
        <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <select
            className="bf-select"
            style={{ width: 148, flexShrink: 0 }}
            value={target.type}
            onChange={(e) => changeType(index, e.target.value as RoutingTarget["type"])}
          >
            <option value="role">{isDE ? "Rolle" : "Role"}</option>
            <option value="org">{isDE ? "Org-Hierarchie" : "Org hierarchy"}</option>
            <option value="user">{isDE ? "Benutzer" : "User"}</option>
            <option value="group">{isDE ? "Gruppe" : "Group"}</option>
          </select>

          {target.type === "role" && (
            <>
              <datalist id={`${editorId}-dl-${index}`}>
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.label ?? r.name}
                  </option>
                ))}
              </datalist>
              <input
                className="bf-input"
                list={`${editorId}-dl-${index}`}
                value={target.value}
                placeholder={isDE ? "Rollenname" : "Role name"}
                onChange={(e) => update(index, { type: "role", value: e.target.value })}
              />
            </>
          )}

          {target.type === "org" && (
            <select
              className="bf-select"
              value={target.value}
              onChange={(e) =>
                update(index, {
                  type: "org",
                  value: e.target.value as (typeof ORG_OPTIONS)[number]["value"],
                })
              }
            >
              {ORG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {(target.type === "user" || target.type === "group") && (
            <input
              className="bf-input"
              value={target.value}
              placeholder={target.type === "user" ? "User UUID" : "Group UUID"}
              onChange={(e) =>
                update(index, { type: target.type as "user" | "group", value: e.target.value })
              }
            />
          )}

          <button
            type="button"
            className="bf-btn"
            style={{ minWidth: 44, flexShrink: 0 }}
            onClick={() => remove(index)}
            aria-label={isDE ? "Entfernen" : "Remove"}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        className="bf-btn"
        style={{ alignSelf: "flex-start" }}
        onClick={add}
      >
        + {isDE ? "Ziel hinzufügen" : "Add target"}
      </button>
    </div>
  );
}

// ─── StageCard ────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="bf-kicker" style={{ marginBottom: 6 }}>
      {children}
    </p>
  );
}

const STAGE_TYPE_LABELS: Record<WorkflowStage["type"], { de: string; en: string }> = {
  approval: { de: "Freigabe", en: "Approval" },
  notification: { de: "Benachrichtigung", en: "Notification" },
  "trigger-form": { de: "Formular auslösen", en: "Trigger form" },
  condition: { de: "Bedingung", en: "Condition" },
};

function StageCard({
  stage,
  index,
  total,
  onMove,
  onChange,
  onRemove,
  forms,
  roles,
  stageIds,
  locale,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  stage: StageRow;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onChange: (updated: StageRow) => void;
  onRemove: () => void;
  forms: FormOption[];
  roles: RoleOption[];
  stageIds: string[];
  locale: Locale;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const isDE = locale === "de";
  const targets = normalizeTargets(stage.assignTo);

  const rejectType =
    !stage.onReject ? "close" : typeof stage.onReject === "string" ? stage.onReject : "go-to";
  const rejectGoTo = typeof stage.onReject === "object" ? stage.onReject.goTo : "";

  const slaEnabled = Boolean(stage.sla);
  const slaHours = stage.sla?.hours ?? 24;
  const slaReminders = stage.sla?.reminderAt ?? [];

  function setType(type: WorkflowStage["type"]) {
    const fresh = newStageRow(type);
    onChange({ ...fresh, id: stage.id, name: stage.name, _key: stage._key });
  }

  function setAssignTo(newTargets: RoutingTarget[]) {
    const value =
      newTargets.length === 0 ? undefined : newTargets.length === 1 ? newTargets[0] : newTargets;
    onChange({ ...stage, assignTo: value });
  }

  function setSla(enabled: boolean) {
    if (enabled) {
      onChange({ ...stage, sla: { hours: 24, reminderAt: [] } });
    } else {
      const next = { ...stage };
      delete next.sla;
      onChange(next);
    }
  }

  const typeLabel = STAGE_TYPE_LABELS[stage.type];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={() => {}}
      className="bf-panel"
      style={{
        outline: isDragOver ? "2px solid var(--brand)" : undefined,
        outlineOffset: isDragOver ? "-2px" : undefined,
      }}
    >
      {/* ── header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: "1px solid var(--line)",
          background: "var(--canvas-soft)",
          cursor: "grab",
        }}
      >
        <span
          aria-hidden
          style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1, userSelect: "none", flexShrink: 0 }}
        >
          ⠿
        </span>

        <span className="bf-kicker" style={{ flexShrink: 0, minWidth: 20, textAlign: "center" }}>
          {index + 1}
        </span>

        <input
          className="bf-input"
          style={{ flex: 1, minWidth: 0, padding: "6px 10px", fontSize: 14 }}
          value={stage.name}
          placeholder={isDE ? "Stufenname" : "Stage name"}
          onChange={(e) => onChange({ ...stage, name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />

        <StatusBadge
          status={stage.type}
          label={isDE ? typeLabel.de : typeLabel.en}
        />

        <button
          type="button"
          className="bf-btn"
          style={{ padding: "0 8px", minHeight: 34 }}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          aria-label={isDE ? "Nach oben" : "Move up"}
        >
          ▲
        </button>
        <button
          type="button"
          className="bf-btn"
          style={{ padding: "0 8px", minHeight: 34 }}
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          aria-label={isDE ? "Nach unten" : "Move down"}
        >
          ▼
        </button>
        <button
          type="button"
          className="bf-btn"
          style={{ padding: "0 8px", minHeight: 34, color: "var(--accent)", borderColor: "var(--accent)" }}
          onClick={onRemove}
          aria-label={isDE ? "Stufe entfernen" : "Remove stage"}
        >
          ✕
        </button>
      </div>

      {/* ── body ── */}
      <div style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ID + Type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>{isDE ? "Stufen-ID" : "Stage ID"}</FieldLabel>
            <input
              className="bf-input"
              value={stage.id}
              placeholder="e.g. approval-1"
              onChange={(e) => onChange({ ...stage, id: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>{isDE ? "Typ" : "Type"}</FieldLabel>
            <select
              className="bf-select"
              value={stage.type}
              onChange={(e) => setType(e.target.value as WorkflowStage["type"])}
            >
              {(Object.keys(STAGE_TYPE_LABELS) as WorkflowStage["type"][]).map((t) => (
                <option key={t} value={t}>
                  {isDE ? STAGE_TYPE_LABELS[t].de : STAGE_TYPE_LABELS[t].en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* assignTo – approval & notification */}
        {(stage.type === "approval" || stage.type === "notification") && (
          <div>
            <FieldLabel>{isDE ? "Zuweisen an" : "Assign to"}</FieldLabel>
            <RoutingTargetEditor
              id={`rt-${stage._key}`}
              targets={targets}
              onChange={setAssignTo}
              roles={roles}
              locale={locale}
            />
          </div>
        )}

        {/* childFormId – trigger-form */}
        {stage.type === "trigger-form" && (
          <div>
            <FieldLabel>{isDE ? "Unterformular" : "Child form"}</FieldLabel>
            {forms.length > 0 ? (
              <select
                className="bf-select"
                value={stage.childFormId ?? ""}
                onChange={(e) => onChange({ ...stage, childFormId: e.target.value })}
              >
                <option value="">{isDE ? "Formular wählen…" : "Select a form…"}</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="bf-input"
                value={stage.childFormId ?? ""}
                placeholder="Form UUID"
                onChange={(e) => onChange({ ...stage, childFormId: e.target.value })}
              />
            )}
          </div>
        )}

        {/* conditions */}
        {stage.type === "condition" && (
          <div>
            <FieldLabel>{isDE ? "Bedingungen" : "Conditions"}</FieldLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(stage.conditions ?? []).map((cond, ci) => (
                <div key={ci} style={{ display: "flex", gap: 8 }}>
                  <input
                    className="bf-input"
                    value={cond.expression}
                    placeholder="data.field == 'value'"
                    onChange={(e) => {
                      const next = [...(stage.conditions ?? [])];
                      next[ci] = { expression: e.target.value };
                      onChange({ ...stage, conditions: next });
                    }}
                  />
                  <button
                    type="button"
                    className="bf-btn"
                    style={{ minWidth: 44, flexShrink: 0 }}
                    onClick={() => onChange({ ...stage, conditions: (stage.conditions ?? []).filter((_, i) => i !== ci) })}
                    aria-label={isDE ? "Entfernen" : "Remove"}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="bf-btn"
                style={{ alignSelf: "flex-start" }}
                onClick={() => onChange({ ...stage, conditions: [...(stage.conditions ?? []), { expression: "" }] })}
              >
                + {isDE ? "Bedingung" : "Add condition"}
              </button>
            </div>
          </div>
        )}

        {/* onApprove / onReject – approval */}
        {stage.type === "approval" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>{isDE ? "Bei Freigabe" : "On approve"}</FieldLabel>
              <select
                className="bf-select"
                value={stage.onApprove ?? "next-stage"}
                onChange={(e) => onChange({ ...stage, onApprove: e.target.value as "next-stage" | "close" })}
              >
                <option value="next-stage">{isDE ? "Nächste Stufe" : "Next stage"}</option>
                <option value="close">{isDE ? "Abschließen" : "Close"}</option>
              </select>
            </div>
            <div>
              <FieldLabel>{isDE ? "Bei Ablehnung" : "On reject"}</FieldLabel>
              <select
                className="bf-select"
                value={rejectType}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "close" || v === "return-to-submitter") {
                    onChange({ ...stage, onReject: v });
                  } else {
                    onChange({ ...stage, onReject: { goTo: "" } });
                  }
                }}
              >
                <option value="close">{isDE ? "Abschließen" : "Close"}</option>
                <option value="return-to-submitter">{isDE ? "Zurück an Einreicher" : "Return to submitter"}</option>
                <option value="go-to">{isDE ? "Zu Stufe…" : "Go to stage…"}</option>
              </select>
              {rejectType === "go-to" && (
                <select
                  className="bf-select"
                  style={{ marginTop: 8 }}
                  value={rejectGoTo}
                  onChange={(e) => onChange({ ...stage, onReject: { goTo: e.target.value } })}
                >
                  <option value="">{isDE ? "Stufe wählen…" : "Select stage…"}</option>
                  {stageIds
                    .filter((sid) => sid !== stage.id)
                    .map((sid) => (
                      <option key={sid} value={sid}>
                        {sid}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* SLA */}
        <div>
          <label className="bf-checkbox-row" style={{ cursor: "pointer", alignSelf: "flex-start", width: "auto" }}>
            <input type="checkbox" checked={slaEnabled} onChange={(e) => setSla(e.target.checked)} />
            <span>SLA</span>
          </label>
          {slaEnabled && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div>
                <FieldLabel>{isDE ? "Frist (Stunden)" : "Deadline (hours)"}</FieldLabel>
                <input
                  type="number"
                  className="bf-input"
                  min={1}
                  value={slaHours}
                  onChange={(e) =>
                    onChange({ ...stage, sla: { hours: Number(e.target.value), reminderAt: slaReminders } })
                  }
                />
              </div>
              <div>
                <FieldLabel>{isDE ? "Erinnerungen (Std., kommagetrennt)" : "Reminders (h, comma-separated)"}</FieldLabel>
                <input
                  className="bf-input"
                  value={slaReminders.join(", ")}
                  placeholder="12, 6"
                  onChange={(e) => {
                    const vals = e.target.value
                      .split(",")
                      .map((s) => Number(s.trim()))
                      .filter((n) => !isNaN(n) && n > 0);
                    onChange({ ...stage, sla: { hours: slaHours, reminderAt: vals } });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WorkflowsManagerClient ───────────────────────────────────────────────────

export default function WorkflowsManagerClient({
  workflows,
  locale,
  roles = [],
  forms = [],
}: {
  workflows: WorkflowRecord[];
  locale: Locale;
  roles?: RoleOption[];
  forms?: FormOption[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(workflows[0]?.id ?? null);
  const [name, setName] = useState(workflows[0]?.name ?? "");
  const [stages, setStages] = useState<StageRow[]>(
    workflows[0] ? parseDefinition(workflows[0].definition) : [newStageRow("approval")],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const router = useRouter();

  const isDE = locale === "de";

  const copy = isDE
    ? {
        saveError: "Der Workflow konnte nicht gespeichert werden.",
        newWorkflowName: "Neuer Workflow",
        libraryEyebrow: "Workflow-Bibliothek",
        libraryTitle: "Definitionen",
        newWorkflow: "Neuer Workflow",
        version: "Version",
        attachedForms: "verknüpfte Formulare",
        editorEyebrow: "Editor",
        editWorkflow: "Workflow bearbeiten",
        createWorkflow: "Workflow erstellen",
        saving: "Wird gespeichert…",
        saveWorkflow: "Workflow speichern",
        workflowName: "Workflow-Name",
        attachedFormsTitle: "Verknüpfte Formulare",
        noAttachedForms: "Derzeit verweist kein Formular auf diesen Workflow.",
        validationErrorsTitle: "Die Definition enthält Fehler:",
        addStage: "Stufe hinzufügen",
        noStages: "Noch keine Stufen. Fügen Sie eine hinzu.",
      }
    : {
        saveError: "Workflow could not be saved.",
        newWorkflowName: "New workflow",
        libraryEyebrow: "Workflow library",
        libraryTitle: "Definitions",
        newWorkflow: "New workflow",
        version: "Version",
        attachedForms: "attached forms",
        editorEyebrow: "Editor",
        editWorkflow: "Edit workflow",
        createWorkflow: "Create workflow",
        saving: "Saving…",
        saveWorkflow: "Save workflow",
        workflowName: "Workflow name",
        attachedFormsTitle: "Attached forms",
        noAttachedForms: "No forms currently reference this workflow.",
        validationErrorsTitle: "Definition has errors:",
        addStage: "Add stage",
        noStages: "No stages yet. Add one below.",
      };

  const selectedWorkflow = workflows.find((w) => w.id === selectedId) ?? null;
  const stageIds = stages.map((s) => s.id);

  function chooseWorkflow(id: string) {
    const workflow = workflows.find((item) => item.id === id);
    if (!workflow) return;
    setSelectedId(workflow.id);
    setName(workflow.name);
    setStages(parseDefinition(workflow.definition));
    setError(null);
    setValidationErrors([]);
  }

  function newWorkflow() {
    setSelectedId(null);
    setName(copy.newWorkflowName);
    setStages([newStageRow("approval")]);
    setError(null);
    setValidationErrors([]);
  }

  function updateStage(index: number, updated: StageRow) {
    setStages((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStage(from: number, to: number) {
    setStages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    dragFrom.current = index;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragFrom.current !== null && dragFrom.current !== index) {
      moveStage(dragFrom.current, index);
    }
    dragFrom.current = null;
  }

  async function save() {
    setPending(true);
    setError(null);
    setValidationErrors([]);

    const definition = stages.map(stripKey);
    const parsed = createWorkflowSchema.safeParse({ name, definition });
    if (!parsed.success) {
      setPending(false);
      setValidationErrors(formatIssues(parsed.error.issues));
      return;
    }

    const mutationHeaders = await getMutationHeaders();
    const response = await fetch(
      selectedId ? `/api/workflows/${selectedId}` : "/api/workflows",
      {
        method: selectedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...mutationHeaders },
        body: JSON.stringify({ name, definition }),
      },
    );

    setPending(false);

    if (!response.ok) {
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        setError(body?.error?.message ?? copy.saveError);
      } catch {
        setError(copy.saveError);
      }
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {/* ── Library ── */}
      <section className="bf-panel p-5">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <p className="bf-eyebrow">{copy.libraryEyebrow}</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">{copy.libraryTitle}</h2>
          </div>
          <button type="button" onClick={newWorkflow} className="bf-btn bf-btn-primary">
            {copy.newWorkflow}
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
                    {copy.version} {workflow.version} | {workflow.forms.length} {copy.attachedForms}
                  </p>
                </div>
                <StatusBadge status="approval" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Editor ── */}
      <section className="bf-panel p-6">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="bf-eyebrow">{copy.editorEyebrow}</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-none">
              {selectedId ? copy.editWorkflow : copy.createWorkflow}
            </h2>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="bf-btn bf-btn-primary disabled:opacity-60"
          >
            {pending ? copy.saving : copy.saveWorkflow}
          </button>
        </div>

        <div className="mt-5 bf-stack">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bf-input"
            placeholder={copy.workflowName}
          />

          {error && <div className="bf-alert bf-alert-error">{error}</div>}

          {validationErrors.length > 0 && (
            <div className="bf-alert bf-alert-error">
              <p className="font-semibold">{copy.validationErrorsTitle}</p>
              <ul className="mt-2 list-disc pl-4 text-sm">
                {validationErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Stage list */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
            onDragLeave={() => setDragOverIndex(null)}
          >
            {stages.length === 0 && (
              <p className="text-sm text-[var(--muted-strong)] py-2">{copy.noStages}</p>
            )}
            {stages.map((stage, index) => (
              <StageCard
                key={stage._key}
                stage={stage}
                index={index}
                total={stages.length}
                onMove={moveStage}
                onChange={(updated) => updateStage(index, updated)}
                onRemove={() => removeStage(index)}
                forms={forms}
                roles={roles}
                stageIds={stageIds}
                locale={locale}
                isDragOver={dragOverIndex === index}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStages((prev) => [...prev, newStageRow("approval")])}
            className="bf-btn"
            style={{ alignSelf: "flex-start" }}
          >
            + {copy.addStage}
          </button>

          {/* Attached forms */}
          {selectedWorkflow && (
            <div className="bf-panel-muted p-4">
              <p className="bf-kicker">{copy.attachedFormsTitle}</p>
              <div className="mt-3 bf-list">
                {selectedWorkflow.forms.length === 0 ? (
                  <p className="text-sm text-[var(--muted-strong)]">{copy.noAttachedForms}</p>
                ) : (
                  selectedWorkflow.forms.map((form) => (
                    <p key={form.id} className="bf-panel px-3 py-2 text-sm">
                      {form.title}
                    </p>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
