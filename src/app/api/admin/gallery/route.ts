import { jsonError, jsonSuccess, jsonSuccessList, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  adminGalleryListQuerySchema,
  createGallerySchema,
} from "@/features/gallery/gallery.validation";
import {
  createGalleryImage,
  listAdminGalleryImages,
} from "@/features/gallery/gallery.service";

export const runtime = "nodejs";

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function mapRuntimeError(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Missing Cloudinary env")) {
    return jsonError("Cloudinary belum dikonfigurasi.", 500, {
      details: error.message,
    });
  }

  return null;
}

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const parsed = adminGalleryListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const result = await listAdminGalleryImages(parsed.data);
    return jsonSuccessList(result.data, result.meta);
  } catch (error: unknown) {
    console.error("/api/admin/gallery GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Body harus berupa multipart/form-data.", 400);
  }

  const image = formData.get("image");
  if (!isUploadFile(image) || image.size === 0) {
    return jsonError("image wajib diisi.", 400);
  }

  if (!image.type.startsWith("image/")) {
    return jsonError("File harus berupa image.", 400);
  }

  const parsed = createGallerySchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    category: formString(formData, "category"),
    sortOrder: formString(formData, "sortOrder"),
    isActive: formString(formData, "isActive"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const galleryImage = await createGalleryImage(parsed.data, { buffer });
    return jsonSuccess(galleryImage, { status: 201 });
  } catch (error: unknown) {
    const mappedError = mapRuntimeError(error);
    if (mappedError) return mappedError;

    console.error("/api/admin/gallery POST error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
