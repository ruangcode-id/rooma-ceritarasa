import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

const parseDateParam = (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) return undefined;
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const date = parseDateParam(req);
    const session = await SessionUseCase.getSessionByIdAction(id, date);
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error.message === "Session not found") {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const date = parseDateParam(req);
    const body = await req.json();
    await SessionUseCase.updateSessionAction(id, body);

    const updatedWithAvailability = await SessionUseCase.getSessionByIdAction(id, date);
    return NextResponse.json({ success: true, data: updatedWithAvailability });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await SessionUseCase.deleteSessionAction(id);

    return NextResponse.json({ success: true, message: "Session deleted successfully" });
  } catch (error: any) {
    if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error.message === "Session not found") {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error.message.includes("Cannot delete session")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
