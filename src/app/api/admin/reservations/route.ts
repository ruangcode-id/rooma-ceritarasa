import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AdminReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";

/**
 * Admin Reservation Listing
 * GET /api/admin/reservations
 *
 * Query Params:
 *   - date       (YYYY-MM-DD, optional)
 *   - status     (pending|confirmed|checked_in|no_show|cancelled, optional)
 *   - sessionId  (UUID, optional)
 *   - search     (string — nama/nomor HP tamu, optional)
 *   - page       (number, default: 1)
 *   - limit      (number, default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin", "owner"]);

    const { searchParams } = req.nextUrl;
    const result = await AdminReservationUseCase.listReservationsAction({
      date: searchParams.get("date") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sessionId: searchParams.get("sessionId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }

    if (message.includes("Invalid date") || message.includes("Invalid status")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    console.error("/api/admin/reservations GET error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
