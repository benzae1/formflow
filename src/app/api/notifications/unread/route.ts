import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireUser();

    const [count, items] = await Promise.all([
      db.notification.count({
        where: {
          userId: user.id,
          readAt: null,
        },
      }),
      db.notification.findMany({
        where: {
          userId: user.id,
          readAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    return Response.json({ count, items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
