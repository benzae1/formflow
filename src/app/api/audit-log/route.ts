import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "compliance"]);

    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action") ?? undefined;
    const resourceType = searchParams.get("resourceType") ?? undefined;
    const actorId = searchParams.get("actorId") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const format = searchParams.get("format");

    const where = { action, resourceType, actorId };

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNextPage = logs.length > PAGE_SIZE;
    const page = hasNextPage ? logs.slice(0, PAGE_SIZE) : logs;
    const nextCursor = hasNextPage ? page[page.length - 1]?.id : null;

    if (format === "csv") {
      const lines = [
        ["createdAt", "action", "resourceType", "resourceId", "actorId"].join(","),
        ...page.map((log) =>
          [
            log.createdAt.toISOString(),
            log.action,
            log.resourceType,
            log.resourceId,
            log.actorId ?? "",
          ]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        ),
      ];

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="audit-log.csv"',
        },
      });
    }

    return Response.json({ logs: page, nextCursor });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
