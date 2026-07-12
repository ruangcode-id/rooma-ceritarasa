import { NextRequest, NextResponse } from "next/server";
import { BlockedDateUseCase } from "@/application/use-cases/blocked-date/blocked-date.usecase";
import { requireAdminApiSession } from "@/lib/require-admin-api";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ success: false, error: "Missing required query: date" }, { status: 400 });
    }

    const result = await BlockedDateUseCase.checkBlockedDateAction(date);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {

    if (error?.message === "Invalid date" || error?.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
