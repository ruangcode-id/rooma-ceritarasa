import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonError, jsonSuccess, jsonSuccessMessage, jsonValidationError } from "@/lib/api-envelope";
import { updateEventContent, deleteEventContent } from "@/features/event/event-content.service";
import { updateEventContentSchema } from "@/features/event/event-content.validation";

/**
 * PUT /api/admin/events/[id]
 * Admin: Perbarui data artikel event promosi.
 *
 * DELETE /api/admin/events/[id]
 * Admin: Hapus artikel event promosi.
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

    const parsed = updateEventContentSchema.parse(body);
    const result = await updateEventContent(id, parsed);

    return jsonSuccess(result);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    if (message.includes("tidak ditemukan")) {
      return jsonError(message, 404);
    }

    console.error("[PUT /api/admin/events/[id]]", error);
    return jsonError("Gagal memperbarui artikel event.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "owner"]);
    const { id } = await params;

    await deleteEventContent(id);
    return jsonSuccessMessage("Artikel event berhasil dihapus.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return jsonError(message, 401);
    }

    if (message.includes("tidak ditemukan")) {
      return jsonError(message, 404);
    }

    console.error("[DELETE /api/admin/events/[id]]", error);
    return jsonError("Gagal menghapus artikel event.", 500);
  }
}
