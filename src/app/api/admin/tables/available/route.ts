import { NextRequest, NextResponse } from "next/server";
import { getAvailableTables } from "@/features/tables/table.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");
    const capacity = searchParams.get("capacity");

    if (!sessionId || !date || !capacity) {
      return NextResponse.json(
        {
          success: false,
          message: "sessionId, date, and capacity are required",
        },
        { status: 400 }
      );
    }

    const tables = await getAvailableTables(sessionId, date, Number(capacity));

    return NextResponse.json(
      {
        success: true,
        data: tables,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET AVAILABLE TABLES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to get available tables",
      },
      { status: 400 }
    );
  }
}