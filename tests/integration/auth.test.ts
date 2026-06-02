import { beforeEach, describe, expect, test } from "vitest";
import { db } from "../../src/lib/db";
import { authOptions, authorizeCredentials } from "../../src/lib/auth";
import { resetDatabase, seedBaseUsers } from "../support/fixtures";

describe("auth hardening", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseUsers();
    process.env.AUTH_MAX_FAILED_ATTEMPTS = "2";
    process.env.AUTH_FAILED_LOGIN_WINDOW_MINUTES = "15";
    process.env.AUTH_LOCKOUT_DURATION_MINUTES = "15";
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = "60";
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "20";
    process.env.LDAP_URLS = "";
    process.env.LDAP_URL = "";
    process.env.LDAP_BASE_DNS = "";
    process.env.LDAP_BASE_DN = "";
  });

  test("writes an audit entry for failed logins", async () => {
    const result = await authorizeCredentials(
      {
        uid: "admin",
        password: "wrong-password",
      },
      { headers: { "x-forwarded-for": "127.0.0.1" } },
    );

    expect(result).toBeNull();

    const auditLog = await db.auditLog.findFirstOrThrow({
      where: {
        action: "auth.login_failed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(auditLog.actorId).toBeTruthy();
    expect(auditLog.metadata).toMatchObject({
      login: "admin",
      provider: "local",
      reason: "invalid_credentials",
    });
  });

  test("locks accounts after repeated failed attempts", async () => {
    await authorizeCredentials({ uid: "admin", password: "wrong-1" });
    await authorizeCredentials({ uid: "admin", password: "wrong-2" });

    const admin = await db.user.findFirstOrThrow({
      where: { externalId: "admin" },
    });

    expect(admin.lockedUntil).not.toBeNull();

    const result = await authorizeCredentials({ uid: "admin", password: "admin" });
    expect(result).toBeNull();

    const latestAudit = await db.auditLog.findFirstOrThrow({
      where: {
        action: "auth.login_failed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(latestAudit.metadata).toMatchObject({
      login: "admin",
      reason: "account_locked",
    });
  });

  test("stores login rate-limit state in the database", async () => {
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "1";

    await authorizeCredentials({ uid: "unknown-user", password: "wrong-1" });
    const result = await authorizeCredentials({ uid: "unknown-user", password: "wrong-2" });

    expect(result).toBeNull();

    const bucket = await db.loginRateLimitBucket.findUnique({
      where: { key: "login:local:unknown-user" },
    });
    const latestAudit = await db.auditLog.findFirstOrThrow({
      where: {
        action: "auth.login_failed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(bucket?.count).toBe(2);
    expect(latestAudit.metadata).toMatchObject({
      login: "unknown-user",
      reason: "rate_limited",
    });
  });

  test("revokes existing sessions when the user session version changes", async () => {
    const admin = await db.user.findFirstOrThrow({
      where: { externalId: "admin" },
      include: { roles: true },
    });

    const signedInToken = await authOptions.callbacks?.jwt?.({
      token: {},
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        roles: admin.roles.map((role) => role.name),
        sessionVersion: admin.sessionVersion,
      } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    await db.user.update({
      where: { id: admin.id },
      data: {
        sessionVersion: {
          increment: 1,
        },
      },
    });

    const revokedToken = await authOptions.callbacks?.jwt?.({
      token: signedInToken ?? {},
      user: undefined as never,
      account: null,
      profile: undefined,
      trigger: "update",
      isNewUser: false,
      session: undefined,
    });

    expect(revokedToken).toMatchObject({
      error: "SessionRevoked",
    });
  });
});
