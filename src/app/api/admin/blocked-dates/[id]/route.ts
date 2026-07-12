import { NextRequest, NextResponse } from "next/server";
import { BlockedDateUseCase } from "@/application/use-cases/blocked-date/blocked-date.usecase";
import { requireAdminApiSession } from "@/lib/require-admin-api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;
    const { id } = await params;
    const result = await BlockedDateUseCase.deleteBlockedDateAction(id);
    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {

    if (error?.message === "Blocked date not found") {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
