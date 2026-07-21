import "@/infrastructure/notifications/init";
import { NextRequest, NextResponse } from "next/server";
import { createPublicReservation } from "@/features/reservations/reservation.service";
import { publicReservationSchema } from "@/validations/reservation.validation";
import rateLimit from "@/lib/rate-limit";

const limiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 3600000, // 1 hour
});

export async function POST(req: NextRequest) {
  try {
    // A4: Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    try {
      await limiter.check(3, ip);
    } catch {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan (Rate limit exceeded). Silakan coba lagi nanti." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    // A5: Payload Size Limit (50KB)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 50000) {
      return NextResponse.json(
        { success: false, error: "Ukuran data terlalu besar (Payload Too Large)." },
        { status: 413 }
      );
    }

    const body = await req.json().catch(() => null);

    const parsed = publicReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Validation Error",
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
      vipToken: parsed.data.vipToken,
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
        error: isClientError ? "Data tidak valid atau reservasi tidak dapat diproses." : "Internal Server Error",
      },
      { status: isClientError ? 400 : 500 },
    );
  }
}
