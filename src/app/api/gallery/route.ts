import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { publicGalleryListQuerySchema } from "@/features/gallery/gallery.validation";
import { listPublicGalleryImages } from "@/features/gallery/gallery.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicGalleryListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const images = await listPublicGalleryImages(parsed.data);
    return jsonSuccess(images);
  } catch (error: unknown) {
    console.error("/api/gallery GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
