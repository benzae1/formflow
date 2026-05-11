import { db } from "./db";

export async function resolveDelegateOrSelf(userId: string) {
  const now = new Date();

  const delegation = await db.delegation.findFirst({
    where: {
      approverId: userId,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: {
      startsAt: "desc",
    },
  });

  return delegation?.delegateId ?? userId;
}
