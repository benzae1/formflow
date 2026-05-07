import { AppRole } from "@/domain/roles";
import { getSession } from "./auth";

export async function requireUser() {
  const session = await getSession();

  if (!session?.user) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          status: 401,
        },
      }),
      { status: 401 },
    );
  }

  return session.user as {
    id: string;
    email: string;
    roles: AppRole[];
  };
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await requireUser();

  const hasRole = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
          status: 403,
        },
      }),
      { status: 403 },
    );
  }

  return user;
}

export function canViewGlobalSubmissions(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("compliance");
}

export function canApprove(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("approver");
}
