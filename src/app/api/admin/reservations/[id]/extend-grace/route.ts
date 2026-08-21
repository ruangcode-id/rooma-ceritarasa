import { NextRequest, NextResponse } from "next/server";
import { AdminReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";
import { requireRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "owner"]);
    const { id } = await params;

    const { minutes } = await req.json().catch(() => ({ minutes: 15 }));
    const parsedMinutes = parseInt(minutes, 10);
    if (isNaN(parsedMinutes) || parsedMinutes <= 0) {
      return NextResponse.json({ success: false, error: "Menit harus angka positif" }, { status: 400 });
    }

    const result = await AdminReservationUseCase.extendGracePeriodAction(id, parsedMinutes);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[extend-grace] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
