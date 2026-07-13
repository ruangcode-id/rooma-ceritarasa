import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { getSessionAvailability } from "@/features/tables/table.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const { searchParams } = new URL(req.url);

    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");

    // Validasi input
    if (!sessionId || !date) {
      return jsonError("sessionId and date are required", 400);
    }

    // Call service
    const availability = await getSessionAvailability(
      sessionId,
      new Date(date)
    );

    // Success response
    return NextResponse.json(
      {
        success: true,
        data: availability,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET AVAILABILITY ERROR:", error);
    return jsonError("Failed to get session availability", 500);
  }
}
