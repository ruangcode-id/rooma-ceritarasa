import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { getPublishedEventsUseCase } from "@/application/use-cases/event/get-published-events.usecase";

/**
 * GET /api/events
 *
 * Public endpoint — tidak memerlukan autentikasi.
 * Mengembalikan daftar artikel promosi event yang sudah dipublish.
 *
 * Catatan Next.js 15+: GET Route Handler tidak di-cache secara default,
 * tidak perlu menambahkan cache: 'no-store' atau export dynamic.
 */
export async function GET() {
  try {
    const data = await getPublishedEventsUseCase();
    return jsonSuccess(data);
  } catch (e) {
    console.error("[GET /api/events]", e);
    return jsonError("Gagal mengambil daftar event.", 500);
  }
}
