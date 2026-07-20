import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { validateCapacity } from "@/features/tables/table.service";

export async function POST(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json();

    const { sessionId, date, guestCount } = body;

    if (!sessionId || !date || guestCount === undefined) {
      return jsonError("sessionId, date, and guestCount are required", 400);
    }

    const availability = await validateCapacity(
      sessionId,
      date,
      Number(guestCount)
    );

    return NextResponse.json(
      {
        success: true,
        message: "Capacity is available",
        data: availability,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("VALIDATE CAPACITY ERROR:", error);
    return jsonError("Failed to validate capacity", 400);
  }
}
