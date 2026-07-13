import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";
import { requireAdminApiSession } from "@/lib/require-admin-api";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
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
  } catch (error: unknown) {
    console.error("ERROR GET /api/admin/sessions:", error);

    const message = error instanceof Error ? error.message : "Internal Server Error";


    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload request tidak valid atau kosong." },
        { status: 400 }
      );
    }

    const session = await SessionUseCase.createSessionAction(body);

    return NextResponse.json(
      { success: true, data: session },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("ERROR POST /api/admin/sessions:", error);

    const message = error instanceof Error ? error.message : "Internal Server Error";


    if (message.includes("Start time must be before end time")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    if (message.includes("dayOfWeek")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
