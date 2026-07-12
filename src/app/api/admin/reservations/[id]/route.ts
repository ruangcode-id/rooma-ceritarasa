import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { z } from "zod";
import { ReservationStatus } from "@/generated/prisma/client";
import { AdminReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";
import { prisma } from "@/infrastructure/database/prisma";

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
        guest: { select: { id: true, name: true, phone: true, email: true } },
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

const patchBodySchema = z
  .object({
    status: z
      .enum(["confirmed", "checked_in", "no_show", "cancelled"] as const, {
        error:
          "Invalid status. Must be one of: confirmed, checked_in, no_show, cancelled",
      })
      .optional(),
    tableIds: z.array(z.string().uuid("Each tableId must be a valid UUID")).min(1).optional(),
  })
  .refine((data) => data.status !== undefined || data.tableIds !== undefined, {
    message: "At least one of 'status' or 'tableIds' must be provided",
  });

/**
 * Admin Reservation Update (Status & Table Assignment)
 * PATCH /api/admin/reservations/[id]
 *
 * Body options:
 *   - { "status": "confirmed" | "checked_in" | "no_show" | "cancelled" }
 *   - { "tableIds": ["uuid-1", "uuid-2", ...] }
 *   - Both combined: { "status": "confirmed", "tableIds": ["uuid-1", "uuid-2"] }
 *
 * Catatan:
 * - "cancelled" akan membebaskan meja dan men-emit event "reservasi_cancelled" ke Dev C.
 * - tableIds mengganti SEMUA meja reservasi secara atomik.
 * - Total kapasitas meja gabungan harus >= partySize tamu (Opsi 1 — Strict Validation).
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
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Payload request tidak valid atau kosong." },
        { status: 400 }
      );
    }
    const parsed = patchBodySchema.parse(json);

    const result = await AdminReservationUseCase.updateReservationAction({
      reservationId: id,
      status: parsed.status as ReservationStatus | undefined,
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

    // Kapasitas kurang / meja tidak tersedia / reservasi tidak ditemukan (business rule error)
    if (
      message.includes("tidak ditemukan") ||
      message.includes("tidak mencukupi") ||
      message.includes("sudah dipesan")
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
