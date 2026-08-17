import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { SpecialOpenDateRepository } from "@/infrastructure/repositories/special-open-date.repository";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await params;
    const existing = await SpecialOpenDateRepository.getSpecialOpenDateById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Special open date not found" },
        { status: 404 },
      );
    }

    await SpecialOpenDateRepository.deleteSpecialOpenDate(id);
    return NextResponse.json({ success: true, message: "Special open date deleted" });
  } catch (error) {
    console.error("[DELETE /api/admin/special-open-dates/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete special open date" },
      { status: 500 },
    );
  }
}
