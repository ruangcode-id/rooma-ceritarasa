import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

const parseDateParam = (dateStr: string | null) => {
  if (!dateStr) return undefined;
  // Expect YYYY-MM-DD
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const isActiveParam = searchParams.get("isActive");
    const statusParam = searchParams.get("status");
    const date = parseDateParam(searchParams.get("date"));
    
    let isActive: boolean | undefined = undefined;
    if (isActiveParam === "true") isActive = true;
    if (isActiveParam === "false") isActive = false;

    // Spec-friendly alias: status=active|inactive
    if (statusParam === "active") isActive = true;
    if (statusParam === "inactive") isActive = false;

    const result = await SessionUseCase.getSessionsAction({ page, limit, isActive, date });

    return NextResponse.json({
      success: true,
      data: result.sessions,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newSession = await SessionUseCase.createSessionAction(body);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newSession,
          currentCapacity: 0,
          availableSlots: newSession.maxCapacity,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: "Validation Error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
