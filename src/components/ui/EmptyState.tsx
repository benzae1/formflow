import Link from "next/link";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: Props) {
  return (
    <section className="rounded-[28px] border border-dashed border-[var(--line-strong)] bg-[var(--panel)] p-10 text-center shadow-[var(--shadow-md)]">
      <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-[var(--font-display)] text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
