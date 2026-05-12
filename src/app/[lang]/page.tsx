import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";
import { getLocaleContext } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale } = await getLocaleContext(lang);
  const user = await getCurrentUser();

  redirect(user ? getDefaultRouteForRoles(user.roles, locale) : localizePath(locale, "/signin"));
}
