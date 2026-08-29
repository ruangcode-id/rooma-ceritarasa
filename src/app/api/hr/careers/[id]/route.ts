import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { requireHrApiSession } from "@/lib/require-hr-api";
import { updateCareerJobSchema } from "@/features/careers/career.validation";
import {
  deleteCareerJob,
  getAdminCareerJob,
  updateCareerJob,
} from "@/features/careers/career.service";

const idSchema = z.string().uuid("id harus berupa UUID yang valid.");

function hasUpdateValue(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length > 0
  );
}

function mapCareerError(error: unknown) {
  if (error instanceof Error && error.message === "CAREER_JOB_NOT_FOUND") {
    return jsonError("Lowongan kerja tidak ditemukan.", 404);
  }

  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireHrApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  try {
    const job = await getAdminCareerJob(parsedId.data);
    if (!job) {
      return jsonError("Lowongan kerja tidak ditemukan.", 404);
    }

    return jsonSuccess(job);
  } catch (error: unknown) {
    console.error(`/api/admin/careers/${parsedId.data} GET error:`, error);
    return jsonError("Internal Server Error", 500);
  }
}

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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireHrApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  const contentType = request.headers.get("content-type") || "";
  let imageBuffer: Buffer | undefined = undefined;
  let updateData: unknown = {};
  
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Gagal parse form data.", 400);
    }
    
    const image = formData.get("image");
    if (image && isUploadFile(image) && image.size > 0) {
      if (image.size > 8 * 1024 * 1024) return jsonError("Ukuran gambar maksimal 8MB.", 400);
      if (!image.type.startsWith("image/")) return jsonError("File harus berupa image.", 400);
      imageBuffer = Buffer.from(await image.arrayBuffer());
    }

    updateData = {
      title: formString(formData, "title"),
      description: formString(formData, "description"),
      requirements: formString(formData, "requirements"),
      deadline: formString(formData, "deadline"),
      isOpen: formString(formData, "isOpen"),
    };
  } else {
    try {
      updateData = await request.json();
    } catch {
      return jsonError("Body harus berupa JSON atau multipart/form-data.", 400);
    }
  }

  if (!hasUpdateValue(updateData) && !imageBuffer) {
    return jsonError("Minimal satu field atau gambar harus diisi.", 400);
  }

  const parsed = updateCareerJobSchema.safeParse(updateData);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  if (Object.keys(parsed.data).length === 0 && !imageBuffer) {
    return jsonError("Minimal satu field atau gambar harus diisi.", 400);
  }

  try {
    const job = await updateCareerJob(parsedId.data, parsed.data, imageBuffer ? { buffer: imageBuffer } : undefined);
    return jsonSuccess(job);
  } catch (error: unknown) {
    const mappedError = mapCareerError(error);
    if (mappedError) return mappedError;

    if (error instanceof Error && error.message.startsWith("Missing Cloudinary env")) {
      return jsonError("Cloudinary belum dikonfigurasi.", 500);
    }
    console.error(`/api/hr/careers/${parsedId.data} PUT error:`, error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireHrApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  try {
    const job = await deleteCareerJob(parsedId.data);
    return jsonSuccess(job);
  } catch (error: unknown) {
    const mappedError = mapCareerError(error);
    if (mappedError) return mappedError;

    console.error(`/api/admin/careers/${parsedId.data} DELETE error:`, error);
    return jsonError("Internal Server Error", 500);
  }
}
