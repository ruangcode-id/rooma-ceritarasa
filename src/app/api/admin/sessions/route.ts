import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const isActiveParam = searchParams.get("isActive");
    
    let isActive: boolean | undefined = undefined;
    if (isActiveParam === "true") isActive = true;
    if (isActiveParam === "false") isActive = false;

    const result = await SessionUseCase.getSessionsAction(page, limit, isActive);

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

    return NextResponse.json({ success: true, data: newSession }, { status: 201 });
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
