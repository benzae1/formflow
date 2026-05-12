type Props = { status: string };

function toneForStatus(status: string) {
  switch (status) {
    case "published":
    case "approved":
      return {
        border: "var(--haus-green)",
        background: "#F4F8EA",
        color: "var(--ink)",
      };
    case "draft":
    case "submitted":
    case "in_review":
    case "needs_revision":
    case "pending":
      return {
        border: "var(--haus-yellow)",
        background: "#FFFBEA",
        color: "var(--ink)",
      };
    case "rejected":
    case "archived":
    case "closed":
    case "cancelled":
      return {
        border: "var(--haus-red)",
        background: "var(--accent-soft)",
        color: "var(--ink)",
      };
    case "standard":
      return {
        border: "var(--haus-teal)",
        background: "var(--brand-soft)",
        color: "var(--ink)",
      };
    case "pii":
      return {
        border: "var(--haus-orange)",
        background: "#FFF1E1",
        color: "var(--ink)",
      };
    case "sensitive":
    case "compliance":
      return {
        border: "var(--haus-magenta)",
        background: "#F8EAF2",
        color: "var(--ink)",
      };
    default:
      return {
        border: "var(--line-strong)",
        background: "var(--panel)",
        color: "var(--ink)",
      };
  }
}

export function StatusBadge({ status }: Props) {
  const tone = toneForStatus(status);

  return (
    <span
      className="inline-flex border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.1em]"
      style={{
        borderColor: tone.border,
        background: tone.background,
        color: tone.color,
      }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
