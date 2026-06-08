import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const isActive = searchParams.get("isActive");
    const dateStr = searchParams.get("date");

    let isActiveFilter: boolean | undefined;
    if (isActive !== null) {
      isActiveFilter = isActive === "true";
    }

    let date: Date | undefined;
    if (dateStr) {
      date = new Date(`${dateStr}T00:00:00.000Z`);
    }

    const result = await SessionUseCase.getSessionsAction({
      page,
      limit,
      isActive: isActiveFilter,
      date,
    });

    return NextResponse.json({
      success: true,
      data: result.sessions,
      total: result.total,
      page,
      limit,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Payload request tidak valid atau kosong." },
        { status: 400 }
      );
    }
    const session = await SessionUseCase.createSessionAction(body);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error.message.includes("Start time must be before end time")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error.message.includes("dayOfWeek")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}