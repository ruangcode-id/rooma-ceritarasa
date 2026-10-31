import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { ReservationStatus } from "@/generated/prisma/client";
import { AdminReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";
import { prisma } from "@/infrastructure/database/prisma";
import { adminUpdateReservationSchema } from "@/validations/reservation.validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Reservation ID is required" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        guest: { select: { id: true, name: true, phone: true, email: true, notes: true, isVip: true } },
        session: { select: { id: true, name: true, startTime: true, endTime: true } },
        reservationTables: {
          include: { table: { select: { id: true, tableNumber: true, capacity: true } } }
        }
      }
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reservation });
  } catch {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Admin Reservation Update (Status, Reschedule Date/Session, Table Assignment)
 * PATCH /api/admin/reservations/[id]
 *
 * Body options:
 *   - { "status": "confirmed" | "checked_in" | "no_show" | "cancelled" }
 *   - { "tableIds": ["uuid-1", "uuid-2", ...] }
 *   - Reschedule: { "date": "2026-11-02", "sessionId": "uuid-session", "tableIds": ["uuid-1"] }
 *   - Combined with status: { "status": "confirmed", "date": "...", "sessionId": "...", "tableIds": [...] }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiSession();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload request tidak valid atau kosong." },
        { status: 400 }
      );
    }
    const parsed = adminUpdateReservationSchema.parse(json);

    const result = await AdminReservationUseCase.updateReservationAction({
      reservationId: id,
      status: parsed.status as ReservationStatus | undefined,
      date: parsed.date,
      sessionId: parsed.sessionId,
      tableIds: parsed.tableIds,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const name = error instanceof Error ? error.name : "";

    if (name === "ZodError") {
      return NextResponse.json(
        { success: false, error: message || "Invalid request body" },
        { status: 400 }
      );
    }

    // Business rule error (kapasitas kurang, tutup senin, blocked date, meja konflik, dll)
    if (
      message.includes("tidak ditemukan") ||
      message.includes("tidak mencukupi") ||
      message.includes("sudah dipesan") ||
      message.includes("tidak tersedia") ||
      message.includes("tutup setiap hari") ||
      message.includes("outdoor")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    // Prisma: record not found
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    console.error(`/api/admin/reservations/${(await params).id} PATCH error:`, error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
