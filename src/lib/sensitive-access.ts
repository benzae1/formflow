import { createHmac, timingSafeEqual } from "node:crypto";
const SENSITIVE_ACCESS_COOKIE = "formflow-sensitive-access";
const SENSITIVE_ACCESS_TTL_SECONDS = 10 * 60;

type CookieStore = {
  get(name: string): { value: string } | undefined;
};

type SensitiveAccessGrant = {
  actorId: string;
  scope: string;
  reason: string;
  expiresAt: number;
};

function getSensitiveAccessSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be configured for sensitive access grants.");
  }

  return secret;
}

function encodePayload(payload: SensitiveAccessGrant[]) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string) {
  const raw = Buffer.from(encoded, "base64url").toString("utf8");
  return JSON.parse(raw) as SensitiveAccessGrant[];
}

function signPayload(encoded: string) {
  return createHmac("sha256", getSensitiveAccessSecret()).update(encoded).digest("base64url");
}

function parseSignedCookie(value?: string | null) {
  if (!value) {
    return [];
  }

  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return [];
  }

  const encoded = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const expected = signPayload(encoded);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return [];
  }

  try {
    return decodePayload(encoded);
  } catch {
    return [];
  }
}

function serializeSignedCookie(payload: SensitiveAccessGrant[]) {
  const encoded = encodePayload(payload);
  return `${encoded}.${signPayload(encoded)}`;
}

export function getSensitiveAccessScope(input: {
  kind: "submission" | "admin-submissions";
  id?: string;
}) {
  if (input.kind === "submission") {
    return `submission:${input.id}`;
  }

  return "admin-submissions";
}

export function readSensitiveAccessGrants(cookieStore: CookieStore) {
  const raw = cookieStore.get(SENSITIVE_ACCESS_COOKIE)?.value;
  const grants = parseSignedCookie(raw);
  const now = Date.now();

  return grants.filter((grant) => grant.expiresAt > now);
}

export function getSensitiveAccessGrant(
  cookieStore: CookieStore,
  actorId: string,
  scope: string,
) {
  return readSensitiveAccessGrants(cookieStore).find(
    (grant) => grant.actorId === actorId && grant.scope === scope,
  ) ?? null;
}

export function buildSensitiveAccessCookie(input: {
  actorId: string;
  scope: string;
  reason: string;
}) {
  const nextGrant: SensitiveAccessGrant = {
    actorId: input.actorId,
    scope: input.scope,
    reason: input.reason,
    expiresAt: Date.now() + SENSITIVE_ACCESS_TTL_SECONDS * 1000,
  };

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SENSITIVE_ACCESS_COOKIE}=${serializeSignedCookie([nextGrant])}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SENSITIVE_ACCESS_TTL_SECONDS}${secure}`;
}
