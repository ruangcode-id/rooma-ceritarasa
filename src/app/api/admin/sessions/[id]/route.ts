import { NextRequest, NextResponse } from "next/server";
import { SessionUseCase } from "@/application/use-cases/sessions/session.usecase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    let date: Date | undefined;
    if (dateStr) {
      date = new Date(`${dateStr}T00:00:00.000Z`);
    }

    const session = await SessionUseCase.getSessionByIdAction(id, date);
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
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
    const session = await SessionUseCase.updateSessionAction(id, body);
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error.message === "Session not found") {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error.message.includes("Start time must be before end time")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await SessionUseCase.deleteSessionAction(id);
    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error.message === "Session not found") {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error.message.includes("Cannot delete session")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}