import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";
import { defaultLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? getDefaultRouteForRoles(user.roles, defaultLocale) : localizePath(defaultLocale, "/signin"));
}
