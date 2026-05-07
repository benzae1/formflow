import { AppRole } from "@/domain/roles";
import { WorkflowDefinition, WorkflowStage } from "@/domain/workflow";

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function titleCaseStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getRoleLabel(role: AppRole) {
  switch (role) {
    case "admin":
      return "Administrator";
    case "approver":
      return "Approver";
    case "compliance":
      return "Compliance";
    case "submitter":
    default:
      return "Submitter";
  }
}

export function describeStage(stage: WorkflowStage) {
  const target = Array.isArray(stage.assignTo) ? stage.assignTo : stage.assignTo ? [stage.assignTo] : [];
  const routing =
    target.length === 0
      ? "No routing"
      : target
          .map((item) => `${item.type}:${item.value}`)
          .join(", ");

  const sla = stage.sla
    ? `${stage.sla.hours}h SLA${stage.sla.reminderAt.length ? ` • reminders at ${stage.sla.reminderAt.join(", ")}h` : ""}`
    : "No SLA";

  return `${routing} • ${sla}`;
}

export function summarizeWorkflow(definition: WorkflowDefinition) {
  return definition.map((stage) => ({
    id: stage.id,
    name: stage.name,
    type: stage.type,
    description: describeStage(stage),
  }));
}
