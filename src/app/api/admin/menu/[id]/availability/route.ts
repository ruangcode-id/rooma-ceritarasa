import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { toggleMenuPhotoAvailability } from "@/features/menu/menu.service";

export const runtime = "nodejs";

const idSchema = z.string().uuid("id harus berupa UUID yang valid.");
const toggleSchema = z.object({
  isAvailable: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApiSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const idValidation = idSchema.safeParse(id);
  if (!idValidation.success) {
    return jsonValidationError(idValidation.error);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const updated = await toggleMenuPhotoAvailability(
      idValidation.data,
      parsed.data.isAvailable
    );
    return jsonSuccess(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "MENU_PHOTO_NOT_FOUND") {
      return jsonError("Foto menu tidak ditemukan.", 404);
    }
    console.error("Failed to toggle menu availability:", error);
    return jsonError("Gagal mengubah status ketersediaan menu.", 500);
  }
}
