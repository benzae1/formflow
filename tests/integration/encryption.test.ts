import { afterEach, describe, expect, test } from "vitest";

const originalEnv = {
  FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY,
  FIELD_ENCRYPTION_KEYS: process.env.FIELD_ENCRYPTION_KEYS,
  FIELD_ENCRYPTION_KEY_ID: process.env.FIELD_ENCRYPTION_KEY_ID,
};

afterEach(() => {
  if (originalEnv.FIELD_ENCRYPTION_KEY === undefined) {
    delete process.env.FIELD_ENCRYPTION_KEY;
  } else {
    process.env.FIELD_ENCRYPTION_KEY = originalEnv.FIELD_ENCRYPTION_KEY;
  }

  if (originalEnv.FIELD_ENCRYPTION_KEYS === undefined) {
    delete process.env.FIELD_ENCRYPTION_KEYS;
  } else {
    process.env.FIELD_ENCRYPTION_KEYS = originalEnv.FIELD_ENCRYPTION_KEYS;
  }

  if (originalEnv.FIELD_ENCRYPTION_KEY_ID === undefined) {
    delete process.env.FIELD_ENCRYPTION_KEY_ID;
  } else {
    process.env.FIELD_ENCRYPTION_KEY_ID = originalEnv.FIELD_ENCRYPTION_KEY_ID;
  }
});

describe("encryption configuration", () => {
  test("uses FIELD_ENCRYPTION_KEY_ID to select the active multi-key entry", async () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEYS = `legacy=${"1".repeat(64)},active=${"2".repeat(64)}`;
    process.env.FIELD_ENCRYPTION_KEY_ID = "active";

    const { decryptValue, encryptValue } = await import("../../src/lib/encryption");
    const encrypted = encryptValue({ salary: 12345 });

    expect(encrypted.keyId).toBe("active");
    expect(decryptValue(encrypted)).toEqual({ salary: 12345 });
  });

  test("rejects malformed FIELD_ENCRYPTION_KEYS entries instead of skipping them", async () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEYS = `legacy:${"1".repeat(64)}`;
    delete process.env.FIELD_ENCRYPTION_KEY_ID;

    const { encryptValue } = await import("../../src/lib/encryption");

    expect(() => encryptValue("secret")).toThrow(/FIELD_ENCRYPTION_KEYS entries must use the "id=hexkey" format\./);
  });
});
