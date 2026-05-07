"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const seededAccounts = [
  {
    label: "Administrator",
    email: "admin@example.com",
    accent: "bg-[var(--brand-soft)] text-[var(--brand)]",
  },
  {
    label: "Approver",
    email: "approver@example.com",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  },
  {
    label: "Submitter",
    email: "submitter@example.com",
    accent: "bg-[var(--success-soft)] text-[var(--success)]",
  },
];

export default function SignInClient() {
  const [email, setEmail] = useState("admin@example.com");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/",
    [searchParams],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (!result?.ok) {
      setError("That email is not active in the current environment.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6efe2_0%,#e9dec7_100%)] px-6 py-8 text-[var(--ink)]">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_30rem]">
        <section className="rounded-[40px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[var(--shadow-lg)] backdrop-blur md:p-10">
          <p className="text-xs uppercase tracking-[0.36em] text-[var(--muted)]">
            Welcome back
          </p>
          <h1 className="mt-4 max-w-3xl font-[var(--font-display)] text-6xl leading-[0.94]">
            Step into the right role and pick up the queue.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
            This MVP uses email-only development authentication. Pick one of
            the seeded identities or enter the email manually.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {seededAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => setEmail(account.email)}
                className="rounded-[24px] border border-black/10 bg-white/82 p-5 text-left transition hover:-translate-y-0.5 hover:border-black/20"
              >
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${account.accent}`}>
                  {account.label}
                </span>
                <p className="mt-4 text-sm font-semibold">{account.email}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[34px] border border-[var(--line)] bg-[var(--panel-strong)] p-8 shadow-[var(--shadow-md)]">
          <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
            Sign in
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--canvas)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--brand)]"
                placeholder="you@example.com"
                required
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Enter workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
