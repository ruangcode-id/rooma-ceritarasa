import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, jsonSuccessList, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  adminMenuListQuerySchema,
  createMenuPhotoSchema,
} from "@/features/menu/menu.validation";
import {
  createMenuPhoto,
  listAdminMenuPhotos,
} from "@/features/menu/menu.service";

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
    return jsonError("Cloudinary belum dikonfigurasi.", 500);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const parsed = adminMenuListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const result = await listAdminMenuPhotos(parsed.data);
    const totalPages = Math.ceil(result.total / parsed.data.limit);
    return jsonSuccessList(result.data, {
      total: result.total,
      page: parsed.data.page,
      limit: parsed.data.limit,
      totalPages,
      hasNext: parsed.data.page < totalPages,
      hasPrev: parsed.data.page > 1,
    });
  } catch (error: unknown) {
    console.error("/api/admin/menu GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function POST(request: NextRequest) {
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

  if (image.size > 10 * 1024 * 1024) {
    return jsonError("Ukuran gambar maksimal 10MB.", 400);
  }

  if (!image.type.startsWith("image/")) {
    return jsonError("File harus berupa image.", 400);
  }

  const parsed = createMenuPhotoSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    category: formString(formData, "category"),
    price: formString(formData, "price"),
    sortOrder: formString(formData, "sortOrder"),
    isActive: formString(formData, "isActive"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());

    // Magic bytes validation
    const hex = buffer.subarray(0, 4).toString("hex").toUpperCase();
    const isJpeg = hex.startsWith("FFD8FF");
    const isPng = hex === "89504E47";
    const isWebp =
      hex === "52494646" &&
      buffer.subarray(8, 12).toString("hex").toUpperCase() === "57454250";

    if (!isJpeg && !isPng && !isWebp) {
      return jsonError(
        "Format file tidak valid. Hanya mendukung JPEG, PNG, dan WebP.",
        400,
      );
    }

    const photo = await createMenuPhoto(parsed.data, { buffer });
    return jsonSuccess(photo, { status: 201 });
  } catch (error: unknown) {
    const mappedError = mapRuntimeError(error);
    if (mappedError) return mappedError;

    console.error("/api/admin/menu POST error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
