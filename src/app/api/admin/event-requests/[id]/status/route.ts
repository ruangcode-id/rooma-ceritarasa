import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { updateEventRequestStatus } from "@/features/event/admin-event.service";
import { updateEventRequestStatusSchema } from "@/features/event/admin-event.validation";

/**
 * PUT /api/admin/event-requests/[id]/status
 *
 * Admin menolak atau membatalkan pengajuan event.
 * Body: { "status": "rejected" | "cancelled" }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "owner"]);
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Body harus berupa JSON.", 400);
    }

    const parsed = updateEventRequestStatusSchema.parse(body);
    const result = await updateEventRequestStatus(id, parsed);

    return jsonSuccess(result);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    if (message.includes("tidak ditemukan") || message.includes("Tidak bisa")) {
      return jsonError(message, 422);
    }

    console.error("[PUT /api/admin/event-requests/[id]/status]", error);
    return jsonError("Gagal mengubah status event request.", 500);
  }
}
