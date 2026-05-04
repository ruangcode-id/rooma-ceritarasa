import { NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

export async function GET() {
  try {
    // This route is public and does not require authentication
    // Used for the public booking page to show active sessions
    const sessions = await SessionUseCase.getPublicSessionsAction();

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
