import { NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { AppRole } from "@/domain/roles";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: AppRole[];
};

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.deactivatedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as SessionUser).id;
        token.roles = (user as SessionUser).roles;
      }

      return token;
    },
    async session({ session, token }) {
      (session.user as SessionUser).id = token.id as string;
      (session.user as SessionUser).roles = token.roles as AppRole[];
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return (session?.user as SessionUser | undefined) ?? null;
}

export function getDefaultRouteForRoles(roles: AppRole[]) {
  if (roles.includes("compliance")) {
    return "/admin/audit-log";
  }

  if (roles.includes("admin")) {
    return "/admin";
  }

  if (roles.includes("approver")) {
    return "/inbox";
  }

  return "/submissions";
}
