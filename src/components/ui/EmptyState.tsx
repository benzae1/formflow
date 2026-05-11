import Link from "next/link";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ eyebrow, title, description, actionHref, actionLabel }: Props) {
  return (
    <section className="border border-dashed border-[var(--line-strong)] bg-white p-10 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
