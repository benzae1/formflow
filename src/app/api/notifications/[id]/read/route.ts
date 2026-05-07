import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { apiErrorResponse } from "@/lib/errors";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    await db.notification.updateMany({
      where: {
        id,
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
