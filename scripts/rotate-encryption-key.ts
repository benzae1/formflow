/**
 * Encryption key rotation script.
 *
 * Usage:
 *   OLD_KEY_ID=<id>  OLD_KEY=<64-hex>
 *   NEW_KEY_ID=<id>  NEW_KEY=<64-hex>
 *   ts-node scripts/rotate-encryption-key.ts
 *
 * The script walks every Submission.data, decrypts fields encrypted with
 * OLD_KEY_ID, re-encrypts them with NEW_KEY_ID, and writes the result back.
 * Each row update is wrapped in an audit log entry.
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const algorithm = "aes-256-gcm";

function requireHexKey(envVar: string): Buffer {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} is required.`);
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) throw new Error(`${envVar} must be 64 hex chars.`);
  return Buffer.from(raw, "hex");
}

function decrypt(payload: Record<string, unknown>, key: Buffer): unknown {
  const iv = Buffer.from(payload.iv as string, "hex");
  const tag = Buffer.from(payload.tag as string, "hex");
  const encrypted = Buffer.from(payload.value as string, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

function encrypt(value: unknown, key: Buffer, keyId: string): Record<string, unknown> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const plaintext = JSON.stringify(value);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    __encrypted: true,
    keyId,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    value: encrypted.toString("hex"),
  };
}

function rotateField(
  fieldValue: unknown,
  oldKeyId: string,
  oldKey: Buffer,
  newKeyId: string,
  newKey: Buffer,
): { value: unknown; rotated: boolean } {
  if (
    fieldValue &&
    typeof fieldValue === "object" &&
    (fieldValue as Record<string, unknown>).__encrypted === true
  ) {
    const payload = fieldValue as Record<string, unknown>;
    const storedKeyId = (payload.keyId as string | undefined) ?? "default";
    if (storedKeyId === oldKeyId) {
      const plain = decrypt(payload, oldKey);
      return { value: encrypt(plain, newKey, newKeyId), rotated: true };
    }
  }
  return { value: fieldValue, rotated: false };
}

async function main() {
  const oldKeyId = process.env.OLD_KEY_ID ?? "default";
  const newKeyId = process.env.NEW_KEY_ID;
  if (!newKeyId) throw new Error("NEW_KEY_ID is required.");

  const oldKey = requireHexKey("OLD_KEY");
  const newKey = requireHexKey("NEW_KEY");

  const submissions = await db.submission.findMany({
    select: { id: true, data: true },
  });

  let rotatedCount = 0;

  for (const submission of submissions) {
    const data = submission.data as Record<string, unknown>;
    let changed = false;
    const newData: Record<string, unknown> = {};

    for (const [field, fieldValue] of Object.entries(data)) {
      const { value, rotated } = rotateField(fieldValue, oldKeyId, oldKey, newKeyId, newKey);
      newData[field] = value;
      if (rotated) changed = true;
    }

    if (!changed) continue;

    await db.submission.update({
      where: { id: submission.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { data: newData as any },
    });

    await db.auditLog.create({
      data: {
        action: "encryption.key_rotated",
        resourceType: "submission",
        resourceId: submission.id,
        metadata: { oldKeyId, newKeyId } as unknown as never,
      },
    });

    rotatedCount++;
    console.log(`Rotated submission ${submission.id}`);
  }

  console.log(`Done. Rotated ${rotatedCount} submission(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
