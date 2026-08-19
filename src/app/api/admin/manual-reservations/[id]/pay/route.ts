import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { AdminReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";

/**
 * Admin Manual Reservation Mark Paid
 * PATCH /api/admin/manual-reservations/[id]/pay
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;

    const result = await AdminReservationUseCase.markManualReservationAsPaidAction(id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("/api/admin/manual-reservations/[id]/pay PATCH error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
