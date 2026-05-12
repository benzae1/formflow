import { getCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { getLocaleContext } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";
import { redirect } from "next/navigation";

export default async function LocalizedInboxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const user = await getCurrentUser();

  if (!user) {
    redirect(localizePath(locale, "/signin"));
  }

  return (
    <WorkspaceShell user={user} locale={locale} dictionary={dictionary}>
      {children}
    </WorkspaceShell>
  );
}
