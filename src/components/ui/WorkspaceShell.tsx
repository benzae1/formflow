import { AppRole } from "@/domain/roles";
import { getWorkspaceNavigation } from "@/lib/navigation";
import { NotificationPanel } from "./NotificationPanel";
import { SignOutButton } from "./SignOutButton";
import { SidebarNav } from "./SidebarNav";

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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gridTemplateRows: "auto 1fr",
        minHeight: "100vh",
        background: "var(--canvas)",
        color: "var(--ink)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          gridColumn: "1 / -1",
          display: "grid",
          gridTemplateColumns: "240px 1fr auto",
          alignItems: "stretch",
          borderBottom: "1px solid var(--line-strong)",
          background: "var(--panel)",
        }}
      >
        {/* Logo block */}
        <div
          style={{
            background: "#000",
            color: "#fff",
            padding: "14px 24px",
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.1,
            display: "flex",
            alignItems: "center",
          }}
        >
          Bauhaus-Universität
          <br />
          Weimar
        </div>

        {/* App title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 24px",
            borderRight: "1px solid var(--line)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700 }}>Bauhaus Forms</span>
          <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
            University Communications
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 20px",
              borderLeft: "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {user.name ?? user.email}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderLeft: "1px solid var(--line)",
              padding: "0 4px",
            }}
          >
            <NotificationPanel />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderLeft: "1px solid var(--line)",
              padding: "0 4px",
            }}
          >
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside
        style={{
          background: "var(--panel)",
          borderRight: "1px solid var(--line-strong)",
        }}
      >
        <SidebarNav groups={navigation} />
      </aside>

      {/* ── Main content ── */}
      <main
        style={{
          padding: "48px 56px 80px",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
