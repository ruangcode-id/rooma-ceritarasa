import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { AdminReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";
import { publicReservationSchema } from "@/validations/reservation.validation";
import { jsonValidationError } from "@/lib/api-envelope";

/**
 * Admin Manual Reservation
 * GET /api/admin/manual-reservations
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const { searchParams } = req.nextUrl;

    const result = await AdminReservationUseCase.listReservationsAction({
      date: searchParams.get("date") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sessionId: searchParams.get("sessionId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      isManual: true, // Only fetch manual reservations
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("/api/admin/manual-reservations GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Admin Manual Reservation Create
 * POST /api/admin/manual-reservations
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const body = await req.json();
    const result = publicReservationSchema.safeParse(body);
    
    if (!result.success) {
      return jsonValidationError(result.error);
    }

    const created = await AdminReservationUseCase.createManualReservationAction(
      result.data,
      authResult.userId
    );

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error: unknown) {
    console.error("/api/admin/manual-reservations POST error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
