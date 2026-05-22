import { ZodError } from "zod";
import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { CheckInUseCase } from "@/application/use-cases/check-in/check-in.usecase";

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  try {
    const result = await CheckInUseCase.execute(authResult.userId, json ?? {});
    return jsonSuccess(result);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonValidationError(e);
    }
    const msg = e instanceof Error ? e.message : "Check-in gagal";
    if (msg === "Reservation not found") {
      return jsonError("Reservasi tidak ditemukan.", 404);
    }
    if (msg.includes("not eligible") || msg.includes("cannot be marked")) {
      return jsonError(msg, 409);
    }
    console.error("[check-in]", e);
    return jsonError(msg, 400);
  }
}
