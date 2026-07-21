import { NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: "Missing required query param: date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Public endpoint: list available sessions for given date
    const sessions = await SessionUseCase.getPublicSessionsAction(date);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error: unknown) {
    console.error("Public Sessions Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan internal pada server." }, { status: 500 });
  }
}
