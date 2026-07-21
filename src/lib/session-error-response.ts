import { jsonError } from "@/lib/api-envelope";

export function getSessionErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "Session not found") {
    return jsonError("Session tidak ditemukan.", 404);
  }

  if (message.includes("Invalid date format")) {
    return jsonError("Format tanggal tidak valid.", 400);
  }

  if (message.includes("Start time must be before end time")) {
    return jsonError("Data sesi tidak valid.", 400);
  }

  if (message.includes("dayOfWeek")) {
    return jsonError("Data sesi tidak valid.", 400);
  }

  if (
    message.includes("Cannot delete session") ||
    message.includes("active reservations")
  ) {
    return jsonError("Sesi masih memiliki reservasi aktif.", 400);
  }

  return jsonError("Terjadi kesalahan internal pada server.", 500);
}
