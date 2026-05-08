import { Prisma } from "@prisma/client";
import { db } from "./db";

function normalizeAuditValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeAuditValue(item) ?? null) as Prisma.InputJsonArray;
  }

  if (typeof value === "object") {
    const normalizedEntries = Object.entries(value).flatMap(([key, entryValue]) => {
      const normalized = normalizeAuditValue(entryValue);
      return normalized === undefined ? [] : [[key, normalized] as const];
    });

    return Object.fromEntries(normalizedEntries) as Prisma.InputJsonObject;
  }

  return String(value);
}

export async function writeAuditLog(input: {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
}) {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      beforeState: normalizeAuditValue(input.beforeState) as never,
      afterState: normalizeAuditValue(input.afterState) as never,
      metadata: normalizeAuditValue(input.metadata) as never,
    },
  });
}
