import { getWorkspaceNavigation } from "@/lib/navigation";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { NotificationPanel } from "./NotificationPanel";
import { SignOutButton } from "./SignOutButton";
import { SidebarNav } from "./SidebarNav";

type WorkspaceUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
};

export function WorkspaceShell({
  user,
  locale,
  dictionary,
  children,
}: {
  user: WorkspaceUser;
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const navigation = getWorkspaceNavigation(user.roles, locale, dictionary);

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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 24px",
            borderRight: "1px solid var(--line)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700 }}>{dictionary.common.appName}</span>
          <span style={{ fontSize: 11, color: "var(--muted-strong)", marginTop: 1 }}>
            {dictionary.common.brandSubtitle}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "stretch" }}>
          <LanguageSwitcher locale={locale} dictionary={dictionary} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 20px",
              borderLeft: "1px solid var(--line)",
              minWidth: 180,
            }}
          >
            <span className="bf-kicker">{dictionary.common.signedIn}</span>
            <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
              {user.name ?? user.email}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderLeft: "1px solid var(--line)",
            }}
          >
            <NotificationPanel
              locale={locale}
              labels={{
                button: dictionary.workspace.alerts,
                panelTitle: dictionary.workspace.notifications,
                empty: dictionary.workspace.notificationsEmpty,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderLeft: "1px solid var(--line)",
            }}
          >
            <SignOutButton locale={locale} label={dictionary.workspace.signOut} />
          </div>
        </div>
      </header>

      <aside
        style={{
          background: "var(--panel)",
          borderRight: "1px solid var(--line-strong)",
        }}
      >
        <SidebarNav groups={navigation} />
      </aside>

      <main
        style={{
          padding: "40px 48px 80px",
          minWidth: 0,
        }}
      >
        <div className="bf-shell-content">{children}</div>
      </main>
    </div>
  );
}
