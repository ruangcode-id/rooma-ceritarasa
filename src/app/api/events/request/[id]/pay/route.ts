import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { createEventPayment } from "@/features/event/public-event.service";

/**
 * POST /api/events/request/[id]/pay
 *
 * Public endpoint — tidak memerlukan autentikasi.
 * Tamu menekan tombol "Accept & Pay Deposit".
 * Sistem membuat transaksi Midtrans dan mengembalikan token pembayaran.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await createEventPayment(id);
    return jsonSuccess(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("tidak ditemukan")) {
      return jsonError(message, 404);
    }

    if (
      message.includes("tidak bisa dilakukan") ||
      message.includes("sudah ada transaksi") ||
      message.includes("belum tersedia")
    ) {
      return jsonError(message, 422);
    }

    console.error("[POST /api/events/request/[id]/pay]", error);
    return jsonError("Gagal membuat transaksi pembayaran.", 500);
  }
}
