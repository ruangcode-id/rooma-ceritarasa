import "@/infrastructure/notifications/init";
import { NextRequest, NextResponse } from "next/server";
import { createPublicReservation } from "@/features/reservations/reservation.service";
import { publicReservationSchema } from "@/validations/reservation.validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const parsed = publicReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await createPublicReservation({
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone,
      guestEmail: parsed.data.guestEmail,
      sessionId: parsed.data.sessionId,
      tableIds: parsed.data.tableIds,
      date: parsed.data.date,
      partySize: parsed.data.partySize,
      specialRequest: parsed.data.specialRequest,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error creating reservation:", error);

    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    const isClientError =
      message.includes("tidak tersedia untuk reservasi") ||
      message.includes("Meja tidak ditemukan") ||
      message.includes("Beberapa meja") ||
      message.includes("Meja yang dipilih sudah dipesan") ||
      message.includes("sudah dipesan atau sedang dalam proses pembayaran") ||
      message.includes("Kapasitas total meja") ||
      message.includes("tidak mencukupi untuk jumlah tamu") ||
      message.includes("tidak ditemukan atau tidak tersedia") ||
      message.includes("Minimal satu meja harus dipilih") ||
      message.includes("Session tidak ditemukan") ||
      message.includes("Meja tidak tersedia");

    return NextResponse.json(
      {
        success: false,
        error: isClientError ? message : "Internal Server Error",
      },
      { status: isClientError ? 400 : 500 },
    );
  }
}
