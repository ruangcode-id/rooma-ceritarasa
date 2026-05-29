import { NextRequest, NextResponse } from "next/server";
import { autoAssignTable } from "@/features/tables/table.service";

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

    const table = await autoAssignTable(
      sessionId,
      date,
      Number(guestCount)
    );

    return NextResponse.json({
      success: true,
      message: "Table assigned successfully",
      data: table,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to auto assign table",
      },
      { status: 400 }
    );
  }
}