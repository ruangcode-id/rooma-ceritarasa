import { NextRequest, NextResponse } from "next/server";
import { validateCapacity } from "@/features/tables/table.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { sessionId, date, guestCount } = body;

    if (!sessionId || !date || guestCount === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "sessionId, date, and guestCount are required",
        },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error("VALIDATE CAPACITY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to validate capacity",
      },
      { status: 400 }
    );
  }
}