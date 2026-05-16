import { NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { authenticateLdapUser, isLdapConfigured } from "./ldap";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
import {
  checkRateLimited,
  findUserForAuthentication,
  getRequestIpAddress,
  isUserLoginLocked,
  recordFailedLoginAttempt,
  resetFailedLoginState,
} from "./auth-security";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 8 * 60 * 60;

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
  sessionVersion: number;
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

function haveSameRoles(currentRoles: string[], nextRoles: string[]) {
  const current = [...currentRoles].sort();
  const next = [...nextRoles].sort();

  return current.length === next.length && current.every((role, index) => role === next[index]);
}

export async function authorizeCredentials(
  credentials: Record<string, string> | undefined,
  request?: { headers?: Headers | Record<string, string | string[] | undefined> },
) {
  const login = credentials?.uid?.trim() || credentials?.email?.trim() || "";
  const password = credentials?.password ?? "";

  if (!login || !password) {
    return null;
  }

  const normalizedLogin = login.toLowerCase();
  const provider = isLdapConfigured() ? "ldap" : "local";
  const ipAddress = getRequestIpAddress(request);

  if (
    await checkRateLimited({
      login: normalizedLogin,
      provider,
      ipAddress,
    })
  ) {
    return null;
  }

  const existingUser = await findUserForAuthentication(normalizedLogin);

  if (
    await isUserLoginLocked(existingUser, {
      login: normalizedLogin,
      provider,
      ipAddress,
    })
  ) {
    return null;
  }

  if (isLdapConfigured()) {
    const profile = await authenticateLdapUser(normalizedLogin, password);

    if (!profile) {
      await recordFailedLoginAttempt(
        existingUser,
        {
          login: normalizedLogin,
          provider: "ldap",
          ipAddress,
        },
        existingUser?.deactivatedAt ? "deactivated" : "invalid_credentials",
      );
      return null;
    }

    const nextRoles = Array.from(new Set(profile.roles));
    const existingRoles = existingUser ? getRoleNames(existingUser.roles) : [];
    const shouldRevokeExistingSessions =
      !!existingUser &&
      (
        existingUser.deactivatedAt !== null ||
        existingUser.externalId !== profile.uid ||
        existingUser.name !== profile.name ||
        !haveSameRoles(existingRoles, nextRoles)
      );

    const user = await db.user.upsert({
      where: { email: profile.email },
      include: { roles: true },
      update: {
        name: profile.name,
        roles: {
          set: [],
          ...buildRoleConnections(nextRoles),
        },
        externalId: profile.uid,
        deactivatedAt: null,
        ...(shouldRevokeExistingSessions
          ? {
              sessionVersion: {
                increment: 1,
              },
            }
          : {}),
      },
      create: {
        email: profile.email,
        name: profile.name,
        roles: buildRoleConnections(nextRoles),
        externalId: profile.uid,
      },
    });

    await resetFailedLoginState(user.id, normalizedLogin, "ldap", ipAddress);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: getRoleNames(user.roles),
      sessionVersion: user.sessionVersion,
    };
  }

  if (!existingUser) {
    await recordFailedLoginAttempt(
      null,
      {
        login: normalizedLogin,
        provider: "local",
        ipAddress,
      },
      "invalid_credentials",
    );
    return null;
  }

  if (existingUser.deactivatedAt) {
    await recordFailedLoginAttempt(
      existingUser,
      {
        login: normalizedLogin,
        provider: "local",
        ipAddress,
      },
      "deactivated",
    );
    return null;
  }

  if (!existingUser.passwordHash) {
    await recordFailedLoginAttempt(
      existingUser,
      {
        login: normalizedLogin,
        provider: "local",
        ipAddress,
      },
      "password_unavailable",
    );
    return null;
  }

  const passwordValid = await compare(password, existingUser.passwordHash);
  if (!passwordValid) {
    await recordFailedLoginAttempt(
      existingUser,
      {
        login: normalizedLogin,
        provider: "local",
        ipAddress,
      },
      "invalid_credentials",
    );
    return null;
  }

  await resetFailedLoginState(existingUser.id, normalizedLogin, "local", ipAddress);

  return {
    id: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    roles: getRoleNames(existingUser.roles),
    sessionVersion: existingUser.sessionVersion,
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
      async authorize(credentials, req) {
        return authorizeCredentials(
          credentials as Record<string, string> | undefined,
          req as { headers?: Headers | Record<string, string | string[] | undefined> } | undefined,
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        token.id = (user as SessionUser).id;
        token.roles = (user as SessionUser).roles;
        token.sessionVersion = (user as SessionUser).sessionVersion;
        token.accessTokenExpiry = now + ACCESS_TOKEN_TTL_SECONDS;
        token.refreshTokenExpiry = now + REFRESH_TOKEN_TTL_SECONDS;
        return token;
      }

      const tokenUserId = typeof token.id === "string" ? token.id : null;
      if (!tokenUserId) {
        return { ...token, error: "SessionRevoked" };
      }

      const currentUser = await db.user.findUnique({
        where: { id: tokenUserId },
        include: { roles: true },
      });

      if (
        !currentUser ||
        currentUser.deactivatedAt ||
        currentUser.sessionVersion !== token.sessionVersion
      ) {
        return { ...token, error: "SessionRevoked" };
      }

      token.roles = getRoleNames(currentUser.roles);
      token.sessionVersion = currentUser.sessionVersion;

      if (now < (token.refreshTokenExpiry as number)) {
        if (now > (token.accessTokenExpiry as number)) {
          token.accessTokenExpiry = now + ACCESS_TOKEN_TTL_SECONDS;
        }
        return token;
      }

      return { ...token, error: "RefreshTokenExpired" };
    },
    async session({ session, token }) {
      if ((token as { error?: string }).error) {
        (session as { error?: string }).error = (token as { error?: string }).error;
      }
      (session.user as SessionUser).id = token.id as string;
      (session.user as SessionUser).roles = token.roles as string[];
      (session.user as SessionUser).sessionVersion = token.sessionVersion as number;
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if ((session as { error?: string } | null)?.error) {
    return null;
  }

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
