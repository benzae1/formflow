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
    <section className="bf-panel px-8 py-10 text-center">
      <p className="bf-eyebrow">
        {eyebrow}
      </p>
      <div className="bf-rule mx-auto mt-3" />
      <h2 className="mt-5 text-[32px] font-extrabold leading-none">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-strong)]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="bf-btn bf-btn-primary mt-6 inline-flex"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
