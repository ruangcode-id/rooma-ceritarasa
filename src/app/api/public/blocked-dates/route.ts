import { NextRequest, NextResponse } from "next/server";
import { BlockedDateUseCase } from "@/application/use-cases/blocked-date/blocked-date.usecase";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: "Missing required query: month and year" },
        { status: 400 }
      );
    }

    const dates = await BlockedDateUseCase.getPublicBlockedDatesAction({ month, year });

    // Public should NOT expose reason
    return NextResponse.json({ success: true, data: dates });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Invalid query" },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
