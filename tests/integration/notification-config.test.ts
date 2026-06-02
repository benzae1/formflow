import { afterEach, describe, expect, test, vi } from "vitest";

const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  DISABLE_EMAIL_DELIVERY: process.env.DISABLE_EMAIL_DELIVERY,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
};

afterEach(() => {
  vi.resetModules();

  if (originalEnv.RESEND_API_KEY === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
  }

  if (originalEnv.DISABLE_EMAIL_DELIVERY === undefined) {
    delete process.env.DISABLE_EMAIL_DELIVERY;
  } else {
    process.env.DISABLE_EMAIL_DELIVERY = originalEnv.DISABLE_EMAIL_DELIVERY;
  }

  if (originalEnv.EMAIL_FROM_ADDRESS === undefined) {
    delete process.env.EMAIL_FROM_ADDRESS;
  } else {
    process.env.EMAIL_FROM_ADDRESS = originalEnv.EMAIL_FROM_ADDRESS;
  }
});

describe("notification email configuration", () => {
  test("fails module initialization when email delivery is enabled without a sender", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.DISABLE_EMAIL_DELIVERY = "false";
    delete process.env.EMAIL_FROM_ADDRESS;
    vi.resetModules();

    await expect(
      import("../../src/temporal/activities/notificationActivities"),
    ).rejects.toThrow(/EMAIL_FROM_ADDRESS must be configured when email delivery is enabled\./);
  });
});
