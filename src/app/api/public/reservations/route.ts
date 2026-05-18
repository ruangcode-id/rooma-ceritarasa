import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { publicReservationSchema } from "@/validations/reservation.validation";
import { PublicReservationUseCase } from "@/application/use-cases/reservation/reservation.usecase";

export async function POST(request: Request) {
  try {
    let json;
    try {
      json = await request.json();
    } catch {
      return jsonError("Body harus berupa JSON.", 400);
    }

    const parsed = publicReservationSchema.safeParse(json);
    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const result = await PublicReservationUseCase.createReservationAction(parsed.data);

    return jsonSuccess(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    const isClientError =
      message.includes("tidak tersedia untuk reservasi") ||
      message.includes("Meja tidak ditemukan") ||
      message.includes("Meja yang dipilih sudah dipesan") ||
      message.includes("sudah dipesan atau sedang dalam proses pembayaran") ||
      message.includes("tidak mencukupi untuk jumlah tamu") ||
      message.includes("tidak ditemukan atau tidak tersedia") ||
      message.includes("Minimal satu meja harus dipilih");

    if (isClientError) {
      return jsonError(message, 400);
    }

    console.error("Public Reservation Error:", error);
    return jsonError("Internal Server Error", 500);
  }
}

