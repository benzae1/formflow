import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "compliance"]);

    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action") ?? undefined;
    const resourceType = searchParams.get("resourceType") ?? undefined;
    const format = searchParams.get("format");

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

    if (format === "csv") {
      const lines = [
        ["createdAt", "action", "resourceType", "resourceId", "actorId"].join(","),
        ...logs.map((log) =>
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

    return Response.json({ logs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
