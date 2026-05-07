import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}
