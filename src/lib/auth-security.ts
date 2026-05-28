import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { writeAuditLog } from "./audit";

type AuthenticatedDbUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "externalId"
  | "passwordHash"
  | "failedLoginCount"
  | "lastFailedLoginAt"
  | "lockedUntil"
  | "sessionVersion"
  | "deactivatedAt"
> & {
  roles: Array<Pick<Role, "name">>;
};

type RequestLike = {
  headers?: Headers | Record<string, string | string[] | undefined>;
};

type LoginAuditContext = {
  login: string;
  provider: "local" | "ldap";
  ipAddress: string | null;
};

type LoginFailureReason =
  | "invalid_credentials"
  | "rate_limited"
  | "account_locked"
  | "deactivated"
  | "password_unavailable";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getFailedLoginLimit() {
  return getPositiveNumberEnv("AUTH_MAX_FAILED_ATTEMPTS", 5);
}

function getFailedLoginWindowMs() {
  return getPositiveNumberEnv("AUTH_FAILED_LOGIN_WINDOW_MINUTES", 15) * 60_000;
}

function getLockoutDurationMs() {
  return getPositiveNumberEnv("AUTH_LOCKOUT_DURATION_MINUTES", 15) * 60_000;
}

function getLoginRateLimitWindowMs() {
  return getPositiveNumberEnv("AUTH_RATE_LIMIT_WINDOW_SECONDS", 60) * 1_000;
}

function getLoginRateLimitMaxAttempts() {
  return getPositiveNumberEnv("AUTH_RATE_LIMIT_MAX_ATTEMPTS", 10);
}

function getPositiveNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? "");
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getHeaderValue(
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  name: string,
) {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const direct = headers[name];
  if (typeof direct === "string") {
    return direct;
  }

  if (Array.isArray(direct)) {
    return direct[0] ?? null;
  }

  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  if (!match) {
    return null;
  }

  const [, value] = match;
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] ?? null : null;
}

export function getRequestIpAddress(request?: RequestLike) {
  const forwardedFor = getHeaderValue(request?.headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  const realIp = getHeaderValue(request?.headers, "x-real-ip");
  return realIp?.trim() || null;
}

function getRateLimitKeys(login: string, provider: "local" | "ldap", ipAddress: string | null) {
  const keys = [`login:${provider}:${login.toLowerCase()}`];

  if (ipAddress) {
    keys.push(`ip:${provider}:${ipAddress}`);
  }

  return keys;
}

function consumeRateLimitBucket(key: string) {
  const now = Date.now();
  const windowMs = getLoginRateLimitWindowMs();
  const maxAttempts = getLoginRateLimitMaxAttempts();
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return false;
  }

  existing.count += 1;
  rateLimitBuckets.set(key, existing);
  return existing.count > maxAttempts;
}

function clearRateLimitBuckets(login: string, provider: "local" | "ldap", ipAddress: string | null) {
  for (const key of getRateLimitKeys(login, provider, ipAddress)) {
    if (key.startsWith(`login:${provider}:`)) {
      rateLimitBuckets.delete(key);
    }
  }
}

export async function checkRateLimited(context: LoginAuditContext) {
  const limited = getRateLimitKeys(context.login, context.provider, context.ipAddress).some((key) =>
    consumeRateLimitBucket(key),
  );

  if (!limited) {
    return false;
  }

  await writeAuditLog({
    action: "auth.login_failed",
    resourceType: "auth",
    resourceId: context.login,
    metadata: {
      login: context.login,
      provider: context.provider,
      ipAddress: context.ipAddress,
      reason: "rate_limited",
    },
  });

  return true;
}

export async function findUserForAuthentication(login: string) {
  const normalizedLogin = login.trim().toLowerCase();
  if (!normalizedLogin) {
    return null;
  }

  const userSelect = {
    roles: {
      select: { name: true },
    },
  };

  if (normalizedLogin.includes("@")) {
    return db.user.findFirst({
      where: {
        email: normalizedLogin,
      },
      include: userSelect,
    });
  }

  const activeExternalUser = await db.user.findFirst({
    where: {
      externalId: normalizedLogin,
      deactivatedAt: null,
    },
    include: userSelect,
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (activeExternalUser) {
    return activeExternalUser;
  }

  return db.user.findFirst({
    where: {
      externalId: normalizedLogin,
    },
    include: userSelect,
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function isUserLoginLocked(
  user: AuthenticatedDbUser | null,
  context: LoginAuditContext,
) {
  if (!user?.lockedUntil || user.lockedUntil <= new Date()) {
    return false;
  }

  await writeAuditLog({
    actorId: user.id,
    action: "auth.login_failed",
    resourceType: "auth",
    resourceId: user.id,
    metadata: {
      login: context.login,
      provider: context.provider,
      ipAddress: context.ipAddress,
      reason: "account_locked",
      lockedUntil: user.lockedUntil.toISOString(),
    },
  });

  return true;
}

export async function recordFailedLoginAttempt(
  user: AuthenticatedDbUser | null,
  context: LoginAuditContext,
  reason: LoginFailureReason,
) {
  let lockedUntil: Date | null = user?.lockedUntil ?? null;

  if (user && !user.deactivatedAt && reason === "invalid_credentials") {
    const now = new Date();
    const windowMs = getFailedLoginWindowMs();
    const maxAttempts = getFailedLoginLimit();
    const lastAttemptAt = user.lastFailedLoginAt?.getTime() ?? 0;
    const withinWindow = now.getTime() - lastAttemptAt <= windowMs;
    const nextFailedLoginCount = withinWindow ? user.failedLoginCount + 1 : 1;
    const shouldLock = nextFailedLoginCount >= maxAttempts;

    lockedUntil = shouldLock ? new Date(now.getTime() + getLockoutDurationMs()) : null;

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextFailedLoginCount,
        lastFailedLoginAt: now,
        lockedUntil,
      },
    });
  }

  await writeAuditLog({
    actorId: user?.id,
    action: "auth.login_failed",
    resourceType: "auth",
    resourceId: user?.id ?? context.login,
    metadata: {
      login: context.login,
      provider: context.provider,
      ipAddress: context.ipAddress,
      reason,
      ...(lockedUntil ? { lockedUntil: lockedUntil.toISOString() } : {}),
    },
  });
}

export async function resetFailedLoginState(
  userId: string,
  login: string,
  provider: "local" | "ldap",
  ipAddress: string | null,
) {
  await db.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
    },
  });

  clearRateLimitBuckets(login, provider, ipAddress);
}

export async function revokeUserSessions(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
  });
}
