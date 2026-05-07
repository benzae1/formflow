import { db } from "./db";

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
      beforeState: input.beforeState as never,
      afterState: input.afterState as never,
      metadata: input.metadata as never,
    },
  });
}
