import crypto from "crypto";

const algorithm = "aes-256-gcm";

type KeyMap = Map<string, Buffer>;

function parseMultiKeyEntry(entry: string) {
  const trimmed = entry.trim();
  if (!trimmed) {
    return null;
  }

  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) {
    throw new Error(
      'FIELD_ENCRYPTION_KEYS entries must use the "id=hexkey" format.',
    );
  }

  const id = trimmed.slice(0, eqIdx).trim();
  const hex = trimmed.slice(eqIdx + 1).trim();
  if (!id || !hex) {
    throw new Error(
      'FIELD_ENCRYPTION_KEYS entries must use the "id=hexkey" format.',
    );
  }

  return { id, hex };
}

function parseKeyMap(): KeyMap {
  const keyMap: KeyMap = new Map();

  // Multi-key format: FIELD_ENCRYPTION_KEYS=id1=hex1,id2=hex2,...
  const multi = process.env.FIELD_ENCRYPTION_KEYS;
  if (multi) {
    for (const entry of multi.split(",")) {
      const parsed = parseMultiKeyEntry(entry);
      if (!parsed) {
        continue;
      }

      const { id, hex } = parsed;
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error(`FIELD_ENCRYPTION_KEYS: key "${id}" must be 64 hex chars.`);
      }
      keyMap.set(id, Buffer.from(hex, "hex"));
    }
  }

  // Legacy single-key
  const single = process.env.FIELD_ENCRYPTION_KEY;
  if (single) {
    if (!/^[0-9a-fA-F]{64}$/.test(single)) {
      throw new Error("FIELD_ENCRYPTION_KEY must be a 32-byte key encoded as 64 hex characters.");
    }
    if (!keyMap.has("default")) {
      keyMap.set("default", Buffer.from(single, "hex"));
    }
  }

  if (keyMap.size === 0) {
    throw new Error("No encryption key configured. Set FIELD_ENCRYPTION_KEY or FIELD_ENCRYPTION_KEYS.");
  }

  return keyMap;
}

function getActiveKeyId(): string {
  const active = process.env.FIELD_ENCRYPTION_KEY_ID;
  if (active) return active;
  if (process.env.FIELD_ENCRYPTION_KEYS) {
    const first = process.env.FIELD_ENCRYPTION_KEYS.split(",")
      .map((entry) => parseMultiKeyEntry(entry))
      .find((entry) => entry !== null);
    if (first) {
      return first.id;
    }
  }
  return "default";
}

function getKey(keyId: string): Buffer {
  const map = parseKeyMap();
  const key = map.get(keyId);
  if (!key) throw new Error(`Encryption key "${keyId}" not found in key map.`);
  return key;
}

export function encryptValue(value: unknown) {
  const keyId = getActiveKeyId();
  const key = getKey(keyId);
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
    keyId,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    value: encrypted.toString("hex"),
  };
}

export function decryptValue(payload: {
  __encrypted?: boolean;
  keyId?: string;
  iv?: string;
  tag?: string;
  value?: string;
}) {
  if (!payload?.__encrypted) return payload;

  const keyId = payload.keyId ?? "default";
  const key = getKey(keyId);
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
