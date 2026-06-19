import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { apiErrorResponse } from "@/lib/errors";
import { assertMutationRequest } from "@/lib/request-guard";

export async function POST(req: Request) {
  try {
    assertMutationRequest(req);
    const user = await requireUser();

    await db.notification.updateMany({
      where: {
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
