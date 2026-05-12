import { WorkflowDefinition, WorkflowStage } from "@/domain/workflow";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function formatDateTime(value: Date | string | null | undefined, locale: Locale = "de") {
  if (!value) return locale === "de" ? "Nicht verfuegbar" : "Not available";

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined, locale: Locale = "de") {
  if (!value) return locale === "de" ? "Nicht verfuegbar" : "Not available";

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function titleCaseStatus(value: string, locale: Locale = "de") {
  if (locale === "de") {
    return getStatusLabel(value, locale);
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  approver: "Approver",
  compliance: "Compliance",
  submitter: "Submitter",
};

export function getRoleLabel(role: string, locale: Locale = "de") {
  if (locale === "de") {
    return (
      {
        admin: "Administration",
        approver: "Freigabe",
        compliance: "Compliance",
        submitter: "Einreichung",
      }[role] ?? role.charAt(0).toUpperCase() + role.slice(1)
    );
  }

  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export function getStatusLabel(status: string, locale: Locale = "de") {
  const translated =
    locale === "de"
      ? {
          draft: "Entwurf",
          published: "Veroeffentlicht",
          archived: "Archiviert",
          submitted: "Eingereicht",
          in_review: "In Pruefung",
          needs_revision: "Revision noetig",
          approved: "Freigegeben",
          rejected: "Abgelehnt",
          closed: "Geschlossen",
          pending: "Ausstehend",
          cancelled: "Abgebrochen",
          revision_requested: "Revision angefordert",
          standard: "Standard",
          pii: "PII",
          sensitive: "Sensibel",
          compliance: "Compliance",
          approval: "Freigabe",
          notification: "Benachrichtigung",
        }[status]
      : undefined;

  return translated ?? status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getBooleanLabel(value: boolean, dictionary: Dictionary) {
  return value ? dictionary.common.yes : dictionary.common.no;
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
    ? `${stage.sla.hours}h SLA${stage.sla.reminderAt.length ? ` | reminders at ${stage.sla.reminderAt.join(", ")}h` : ""}`
    : "No SLA";

  return `${routing} | ${sla}`;
}

export function summarizeWorkflow(definition: WorkflowDefinition) {
  return definition.map((stage) => ({
    id: stage.id,
    name: stage.name,
    type: stage.type,
    description: describeStage(stage),
  }));
}
