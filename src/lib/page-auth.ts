import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { defaultLocale, type Locale } from "./i18n/config";
import { localizePath } from "./i18n/routing";

export async function requirePageUser(locale: Locale = defaultLocale) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(localizePath(locale, "/signin"));
  }

  return user;
}

export async function requirePageRole(roles: readonly string[], locale: Locale = defaultLocale) {
  const user = await requirePageUser(locale);

  if (!user.roles.some((role) => roles.includes(role))) {
    redirect(localizePath(locale, "/"));
  }

  return user;
}
