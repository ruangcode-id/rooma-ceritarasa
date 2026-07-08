import "@/infrastructure/notifications/init";
import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { PublicReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";
import { cancelReservationSchema } from "@/validations/reservation.validation";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = cancelReservationSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const out = await PublicReservationUseCase.cancelReservationAction(parsed.data);
    if (!out.ok) {
      return jsonError("Token tidak valid atau reservasi tidak ditemukan.", 404);
    }
    return jsonSuccess({ reservationId: out.reservationId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membatalkan";
    if (msg.includes("cannot be cancelled")) {
      return jsonError(msg, 409);
    }
    return jsonError(msg, 400);
  }
}
