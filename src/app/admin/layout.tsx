import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/routing";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dictionary = await getDictionary(defaultLocale);
  const user = await getCurrentUser();

  if (!user) {
    redirect(localizePath(defaultLocale, "/signin"));
  }

  return (
    <WorkspaceShell user={user} locale={defaultLocale} dictionary={dictionary}>
      {children}
    </WorkspaceShell>
  );
}
