import crypto from "crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("FIELD_ENCRYPTION_KEY is missing.");
  }

  return Buffer.from(raw, "hex");
}

export function encryptValue(value: unknown) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const plaintext = JSON.stringify(value);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    __encrypted: true,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    value: encrypted.toString("hex"),
  };
}

export function decryptValue(payload: {
  __encrypted?: boolean;
  iv?: string;
  tag?: string;
  value?: string;
}) {
  if (!payload?.__encrypted) return payload;

  const key = getKey();
  const iv = Buffer.from(payload.iv ?? "", "hex");
  const tag = Buffer.from(payload.tag ?? "", "hex");
  const encrypted = Buffer.from(payload.value ?? "", "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
