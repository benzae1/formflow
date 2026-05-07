import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";

const personas = [
  {
    title: "Submitters",
    eyebrow: "Secure intake",
    description:
      "Start policy-controlled forms, track revision loops, and follow each submission through approval without leaving the workspace.",
  },
  {
    title: "Approvers",
    eyebrow: "Decision flow",
    description:
      "Review queued work, triage overdue items, and signal workflow decisions back into Temporal with clear audit trails.",
  },
  {
    title: "Admins & Compliance",
    eyebrow: "Operations control",
    description:
      "Publish forms, inspect workflow health, review sensitive access, and monitor organizational routing in one oversight layer.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteForRoles(user.roles));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6efe2_0%,#eadfca_100%)] px-6 py-8 text-[var(--ink)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[40px] border border-[var(--line)] bg-[var(--panel)] px-8 py-8 shadow-[var(--shadow-lg)] backdrop-blur md:px-10 md:py-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs uppercase tracking-[0.42em] text-[var(--muted)]">
                FormFlow
              </p>
              <h1 className="mt-4 max-w-4xl font-[var(--font-display)] text-5xl leading-[0.94] md:text-7xl">
                Internal approval software with the nerve of an operations desk.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
                Launch secure forms, route sensitive submissions through
                Temporal-backed workflows, and give every role a confident,
                audit-ready place to work.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Sign in
              </Link>
              <a
                href="#roles"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
              >
                Explore the roles
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[34px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[var(--shadow-md)]">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
              Why teams use it
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["Sensitive fields stay encrypted at rest", "Field-level access policies and audit logging are already part of the data path."],
                ["Approval steps stay deterministic", "Temporal handles stage orchestration, reminders, and revision loops without UI guesswork."],
                ["Operations stay visible", "Admins and compliance get dashboards, audit trails, and shared submission context."],
              ].map(([title, description]) => (
                <article
                  key={title}
                  className="rounded-[24px] border border-black/10 bg-white/85 p-5"
                >
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[var(--line)] bg-[linear-gradient(160deg,rgba(29,76,115,0.96),rgba(16,36,59,0.98))] p-8 text-white shadow-[var(--shadow-md)]">
            <p className="text-xs uppercase tracking-[0.34em] text-white/60">
              Development access
            </p>
            <h2 className="mt-5 font-[var(--font-display)] text-4xl">
              Seeded role logins are ready.
            </h2>
            <div className="mt-6 space-y-3 text-sm leading-7 text-white/78">
              <p>`admin@example.com` for publishing and operations.</p>
              <p>`approver@example.com` for decision queue testing.</p>
              <p>`submitter@example.com` for end-user submission flows.</p>
              <p>Authentication is email-only in this MVP pass.</p>
            </div>
          </div>
        </section>

        <section id="roles" className="grid gap-5 lg:grid-cols-3">
          {personas.map((persona, index) => (
            <article
              key={persona.title}
              className="rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-7 shadow-[var(--shadow-md)]"
              style={{ rotate: `${index === 1 ? "-0.5deg" : index === 2 ? "0.6deg" : "0deg"}` }}
            >
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
                {persona.eyebrow}
              </p>
              <h2 className="mt-4 font-[var(--font-display)] text-3xl">
                {persona.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {persona.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
