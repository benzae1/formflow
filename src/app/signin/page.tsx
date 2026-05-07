import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";
import SignInClient from "./sign-in-client";

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteForRoles(user.roles));
  }

  return <SignInClient />;
}
