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
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Top header — same language as sign-in */}
      <header className="flex items-stretch justify-between border-b border-[var(--line-strong)] bg-white">
        <div className="flex items-stretch">
          <div className="bg-black px-6 py-3 text-white text-[12px] font-bold leading-tight whitespace-nowrap">
            Bauhaus-Universität<br />Weimar
          </div>
          <div className="flex flex-col justify-center border-l border-[var(--line)] px-5">
            <span className="text-[15px] font-bold">Bauhaus Forms</span>
            <span className="text-[11px] text-[var(--muted)]">University Communications</span>
          </div>
        </div>
        <div className="flex items-stretch">
          <div className="flex items-center border-l border-[var(--line)] px-5 text-[13px] text-[var(--muted)]">
            <span>{user.name ?? user.email}</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--muted)]">
              ({user.roles.map((r) => getRoleLabel(r)).join(", ")})
            </span>
          </div>
          <div className="flex items-center border-l border-[var(--line)] px-4">
            <NotificationPanel />
          </div>
          <div className="flex items-center border-l border-[var(--line)] px-4">
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex" style={{ minHeight: "calc(100vh - 53px)" }}>
        <aside className="w-52 shrink-0 border-r border-[var(--line-strong)] bg-white flex flex-col">
          <nav className="flex-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block border-b border-[var(--line)] px-6 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)]"
              >
                {item.label}
                <span className="block text-[11px] font-normal text-[var(--muted)] mt-0.5">
                  {item.description}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
