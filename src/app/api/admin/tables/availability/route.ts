import { NextRequest, NextResponse } from "next/server";
import { getSessionAvailability } from "@/features/tables/table.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");

    // Validasi input
    if (!sessionId || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "sessionId and date are required",
        },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error("GET AVAILABILITY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to get session availability",
      },
      { status: 500 }
    );
  }
}