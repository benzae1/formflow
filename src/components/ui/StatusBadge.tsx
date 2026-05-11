type Props = { status: string };

function toneForStatus(status: string) {
  switch (status) {
    case "published":
    case "approved":
      return "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]";
    case "draft":
    case "submitted":
    case "in_review":
    case "needs_revision":
    case "pending":
      return "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]";
    case "rejected":
    case "archived":
    case "closed":
    case "cancelled":
      return "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]";
    default:
      return "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink)]";
  }
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.1em] ${toneForStatus(status)}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
