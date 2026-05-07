import { redirect } from "next/navigation";
import { AppRole } from "@/domain/roles";
import { getCurrentUser } from "./auth";

export async function requirePageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}

export async function requirePageRole(roles: AppRole[]) {
  const user = await requirePageUser();

  if (!user.roles.some((role) => roles.includes(role))) {
    redirect("/");
  }

  return user;
}
