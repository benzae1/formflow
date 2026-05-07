export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="rounded-[30px] border border-[var(--line)] bg-[var(--panel)] px-6 py-6 shadow-[var(--shadow-md)] backdrop-blur md:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            {description}
          </p>
        </div>

        {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </header>
  );
}
