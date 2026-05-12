import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";
import { getLocaleContext } from "@/lib/i18n/server";
import SignInClient from "@/app/signin/sign-in-client";

export default async function LocalizedSignInPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteForRoles(user.roles, locale));
  }

  return <SignInClient locale={locale} dictionary={dictionary} />;
}
