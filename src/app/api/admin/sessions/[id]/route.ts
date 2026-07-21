import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";
import { requireAdminApiSession } from "@/lib/require-admin-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal Server Error";
}

function parseDateParam(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined;

  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!isValidFormat) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const date = parseDateParam(searchParams.get("date"));

    const session = await SessionUseCase.getSessionByIdAction(id, date);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error: unknown) {
    console.error("ERROR GET /api/admin/sessions/[id]:", error);

    const message = getErrorMessage(error);


    if (message === "Session not found") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 }
      );
    }

    if (message.includes("Invalid date format")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body is required" },
        { status: 400 }
      );
    }

    const session = await SessionUseCase.updateSessionAction(id, body);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error: unknown) {
    console.error("ERROR PATCH /api/admin/sessions/[id]:", error);

    const message = getErrorMessage(error);


    if (message === "Session not found") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 }
      );
    }

    if (
      message.includes("Start time must be before end time") ||
      message.includes("dayOfWeek")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;

    await SessionUseCase.deleteSessionAction(id);

    return NextResponse.json({
      success: true,
      message: "Session deleted",
    });
  } catch (error: unknown) {
    console.error("ERROR DELETE /api/admin/sessions/[id]:", error);

    const message = getErrorMessage(error);


    if (message === "Session not found") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 }
      );
    }

    if (
      message.includes("Cannot delete session") ||
      message.includes("active reservations")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}