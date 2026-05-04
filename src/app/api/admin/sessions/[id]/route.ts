import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await SessionUseCase.getSessionByIdAction(id);
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
    const body = await req.json();
    const updatedSession = await SessionUseCase.updateSessionAction(id, body);

    return NextResponse.json({ success: true, data: updatedSession });
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
