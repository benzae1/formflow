import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "compliance"]);

    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action") ?? undefined;
    const resourceType = searchParams.get("resourceType") ?? undefined;

    const logs = await db.auditLog.findMany({
      where: {
        action,
        resourceType,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return Response.json({ logs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
