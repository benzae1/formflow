import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultRouteForRoles } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? getDefaultRouteForRoles(user.roles) : "/signin");
}
