import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import SignInClient from "./sign-in-client";

export default async function SignInPage() {
  const dictionary = await getDictionary(defaultLocale);
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteForRoles(user.roles, defaultLocale));
  }

  return <SignInClient locale={defaultLocale} dictionary={dictionary} />;
}
