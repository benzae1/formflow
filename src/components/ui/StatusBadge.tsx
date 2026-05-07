type Props = {
  status: string;
};

function toneForStatus(status: string) {
  switch (status) {
    case "published":
    case "approved":
      return "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
    case "draft":
    case "submitted":
    case "in_review":
    case "needs_revision":
      return "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]";
    case "rejected":
    case "archived":
    case "closed":
    case "cancelled":
      return "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]";
    default:
      return "border-black/10 bg-black/[0.04] text-[var(--ink)]";
  }
}

export function StatusBadge({ status }: Props) {
  const label = status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${toneForStatus(status)}`}
    >
      {label}
    </span>
  );
}
