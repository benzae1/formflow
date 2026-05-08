import { afterAll, vi } from "vitest";
import { db } from "../../src/lib/db";

export type TestSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: Array<"admin" | "submitter" | "approver" | "compliance">;
};

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");

  return {
    ...actual,
    getSession: mockGetSession,
  };
});

(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.FIELD_ENCRYPTION_KEY ??= "a".repeat(64);
process.env.DISABLE_EMAIL_DELIVERY ??= "true";

afterAll(async () => {
  await db.$disconnect();
});

export function setMockSession(user: TestSessionUser | null) {
  mockGetSession.mockResolvedValue(user ? { user } : null);
}

export function clearMockSession() {
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
}
