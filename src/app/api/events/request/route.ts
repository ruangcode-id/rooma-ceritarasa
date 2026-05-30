import { ZodError } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { submitEventRequestUseCase } from "@/application/use-cases/event/submit-event-request.usecase";

/**
 * POST /api/events/request
 *
 * Public endpoint — tidak memerlukan autentikasi.
 * Tamu mengirimkan formulir pengajuan acara/event.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  try {
    const data = await submitEventRequestUseCase(body);
    return jsonSuccess(data, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonValidationError(e);
    }
    console.error("[POST /api/events/request]", e);
    return jsonError("Gagal mengirim permintaan event. Silakan coba lagi.", 500);
  }
}
