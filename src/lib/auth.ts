import { NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { authenticateLdapUser, isLdapConfigured } from "./ldap";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 8 * 60 * 60;

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
};

function getRoleNames(roles: ReadonlyArray<{ name: string }> | string[]) {
  return roles.map((role) => (typeof role === "string" ? role : role.name));
}

function buildRoleConnections(names: string[]) {
  const uniqueNames = Array.from(new Set(names));

  return {
    connectOrCreate: uniqueNames.map((name) => ({
      where: { name },
      create: { name, label: name },
    })),
  };
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        uid: { label: "User ID", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (isLdapConfigured() && credentials?.uid && credentials.password) {
          const profile = await authenticateLdapUser(credentials.uid, credentials.password);

          if (!profile) return null;

          const user = await db.user.upsert({
            where: { email: profile.email },
            include: { roles: true },
            update: {
              name: profile.name,
              roles: {
                set: [],
                ...buildRoleConnections(profile.roles),
              },
              externalId: profile.uid,
              deactivatedAt: null,
            },
            create: {
              email: profile.email,
              name: profile.name,
              roles: buildRoleConnections(profile.roles),
              externalId: profile.uid,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: getRoleNames(user.roles),
          };
        }

        if (!credentials?.uid || !credentials.password) return null;

        const user = await db.user.findFirst({
          where: { externalId: credentials.uid },
          include: { roles: true },
        });

        if (!user || user.deactivatedAt || !user.passwordHash) return null;

        const passwordValid = await compare(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: getRoleNames(user.roles),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        token.id = (user as SessionUser).id;
        token.roles = (user as SessionUser).roles;
        token.accessTokenExpiry = now + ACCESS_TOKEN_TTL_SECONDS;
        token.refreshTokenExpiry = now + REFRESH_TOKEN_TTL_SECONDS;
        return token;
      }

      // Refresh token still valid — slide the access token window.
      if (now < (token.refreshTokenExpiry as number)) {
        if (now > (token.accessTokenExpiry as number)) {
          token.accessTokenExpiry = now + ACCESS_TOKEN_TTL_SECONDS;
        }
        return token;
      }

      // Refresh token expired — force re-login.
      return { ...token, error: "RefreshTokenExpired" };
    },
    async session({ session, token }) {
      if ((token as { error?: string }).error === "RefreshTokenExpired") {
        (session as { error?: string }).error = "RefreshTokenExpired";
      }
      (session.user as SessionUser).id = token.id as string;
      (session.user as SessionUser).roles = token.roles as string[];
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

export function getDefaultRouteForRoles(roles: readonly string[], locale?: Locale) {
  const path = getDefaultRoutePathForRoles(roles);
  return locale ? localizePath(locale, path) : path;
}

function getDefaultRoutePathForRoles(roles: readonly string[]) {
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
