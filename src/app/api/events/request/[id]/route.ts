import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { getPublicEventRequestDetail } from "@/features/event/public-event.service";

/**
 * GET /api/events/request/[id]
 *
 * Public endpoint — tidak memerlukan autentikasi.
 * Menampilkan detail pengajuan event beserta status dan penawaran terbaru.
 * Digunakan tamu untuk melihat halaman konfirmasi dan memulai pembayaran.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getPublicEventRequestDetail(id);
    return jsonSuccess(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("tidak ditemukan")) {
      return jsonError(message, 404);
    }

    console.error("[GET /api/events/request/[id]]", error);
    return jsonError("Gagal mengambil detail pengajuan event.", 500);
  }
}
