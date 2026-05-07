import Link from "next/link";
import { AppRole } from "@/domain/roles";
import { getRoleLabel } from "@/lib/ui";
import { getWorkspaceNavigation } from "@/lib/navigation";
import { NotificationPanel } from "./NotificationPanel";
import { SignOutButton } from "./SignOutButton";

type WorkspaceUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: AppRole[];
};

export function WorkspaceShell({
  user,
  children,
}: {
  user: WorkspaceUser;
  children: React.ReactNode;
}) {
  const navigation = getWorkspaceNavigation(user.roles);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(244,239,227,0.95),rgba(230,220,198,0.96))] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-[96rem] gap-6 px-4 py-4 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-md)] backdrop-blur md:p-7">
          <Link href="/" className="block">
            <p className="text-xs uppercase tracking-[0.38em] text-[var(--muted)]">
              FormFlow
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-none">
              Casework made deliberate.
            </h1>
          </Link>

          <div className="mt-8 rounded-[24px] border border-black/10 bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
              Signed in
            </p>
            <p className="mt-3 text-lg font-semibold">{user.name ?? user.email}</p>
            <p className="text-sm text-[var(--muted)]">{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-black/10 bg-[var(--canvas)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink)]"
                >
                  {getRoleLabel(role)}
                </span>
              ))}
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-[22px] border border-transparent px-4 py-3 transition hover:border-black/10 hover:bg-white/75"
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-sm text-[var(--muted)]">{item.description}</p>
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-full flex-col gap-5">
          <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] px-5 py-4 shadow-[var(--shadow-md)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Workspace
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Secure submissions, routing, audit visibility, and approvals in
                one shared operating surface.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <NotificationPanel />
              <SignOutButton />
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
