import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { updateMenuPhotoSchema } from "@/features/menu/menu.validation";
import {
  deleteMenuPhoto,
  toggleMenuPhotoStatus,
  updateMenuPhoto,
} from "@/features/menu/menu.service";

export const runtime = "nodejs";

const idSchema = z.string().uuid("id harus berupa UUID yang valid.");

type UpdatePayload = {
  fields: Record<string, unknown>;
  image?: File;
};

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function formFieldIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

async function readUpdatePayload(request: Request): Promise<UpdatePayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const image = formData.get("image");

    return {
      fields: {
        title: formFieldIfPresent(formData, "title"),
        description: formFieldIfPresent(formData, "description"),
        category: formFieldIfPresent(formData, "category"),
        price: formFieldIfPresent(formData, "price"),
        sortOrder: formFieldIfPresent(formData, "sortOrder"),
        isActive: formFieldIfPresent(formData, "isActive"),
      },
      image: isUploadFile(image) && image.size > 0 ? image : undefined,
    };
  }

  if (contentType.includes("application/json")) {
    return { fields: await request.json() };
  }

  throw new Error("UNSUPPORTED_CONTENT_TYPE");
}

function hasUpdateValue(fields: Record<string, unknown>) {
  return Object.values(fields).some((v) => v !== undefined);
}

function mapRuntimeError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "MENU_PHOTO_NOT_FOUND") {
      return jsonError("Menu photo tidak ditemukan.", 404);
    }
    if (error.message.startsWith("Missing Cloudinary env")) {
      return jsonError("Cloudinary belum dikonfigurasi.", 500);
    }
  }
  return null;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return jsonValidationError(parsedId.error);

  let payload: UpdatePayload;
  try {
    payload = await readUpdatePayload(request);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNSUPPORTED_CONTENT_TYPE") {
      return jsonError("Content-Type harus application/json atau multipart/form-data.", 415);
    }
    return jsonError("Body tidak valid.", 400);
  }

  if (payload.image && !payload.image.type.startsWith("image/")) {
    return jsonError("File harus berupa image.", 400);
  }

  if (!hasUpdateValue(payload.fields) && !payload.image) {
    return jsonError("Minimal satu field atau image harus diisi.", 400);
  }

  const parsed = updateMenuPhotoSchema.safeParse(payload.fields);
  if (!parsed.success) return jsonValidationError(parsed.error);

  try {
    let fileArg: { buffer: Buffer } | undefined;
    if (payload.image) {
      const buffer = Buffer.from(await payload.image.arrayBuffer());
      const hex = buffer.subarray(0, 4).toString("hex").toUpperCase();
      const isJpeg = hex.startsWith("FFD8FF");
      const isPng = hex === "89504E47";
      const isWebp =
        hex === "52494646" &&
        buffer.subarray(8, 12).toString("hex").toUpperCase() === "57454250";
      if (!isJpeg && !isPng && !isWebp) {
        return jsonError("Format file tidak valid. Hanya JPEG, PNG, dan WebP.", 400);
      }
      fileArg = { buffer };
    }

    const photo = await updateMenuPhoto(parsedId.data, parsed.data, fileArg);
    return jsonSuccess(photo);
  } catch (error: unknown) {
    const mappedError = mapRuntimeError(error);
    if (mappedError) return mappedError;
    console.error("/api/admin/menu/[id] PUT error:", error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return jsonValidationError(parsedId.error);

  try {
    const result = await deleteMenuPhoto(parsedId.data);
    return jsonSuccess(result);
  } catch (error: unknown) {
    const mappedError = mapRuntimeError(error);
    if (mappedError) return mappedError;
    console.error("/api/admin/menu/[id] DELETE error:", error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return jsonValidationError(parsedId.error);

  try {
    const photo = await toggleMenuPhotoStatus(parsedId.data);
    return jsonSuccess(photo);
  } catch (error: unknown) {
    const mappedError = mapRuntimeError(error);
    if (mappedError) return mappedError;
    console.error("/api/admin/menu/[id] PATCH error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
