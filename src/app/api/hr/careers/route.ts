import {
  jsonError,
  jsonSuccess,
  jsonSuccessList,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireHrApiSession } from "@/lib/require-hr-api";
import {
  adminCareerListQuerySchema,
  createCareerJobSchema,
} from "@/features/careers/career.validation";
import {
  createCareerJob,
  listAdminCareerJobs,
} from "@/features/careers/career.service";

export async function GET(request: Request) {
  const authResult = await requireHrApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const parsed = adminCareerListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const result = await listAdminCareerJobs(parsed.data);
    return jsonSuccessList(result.data, result.meta);
  } catch (error: unknown) {
    console.error("/api/admin/careers GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}

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

export async function POST(request: Request) {
  const authResult = await requireHrApiSession();
  if (!authResult.ok) return authResult.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Body harus berupa multipart/form-data.", 400);
  }

  const image = formData.get("image");
  let imageBuffer: Buffer | undefined = undefined;

  if (image && isUploadFile(image) && image.size > 0) {
    if (image.size > 8 * 1024 * 1024) {
      return jsonError("Ukuran gambar maksimal 8MB.", 400);
    }
    if (!image.type.startsWith("image/")) {
      return jsonError("File harus berupa image.", 400);
    }
    imageBuffer = Buffer.from(await image.arrayBuffer());
    
    const hex = imageBuffer.subarray(0, 4).toString("hex").toUpperCase();
    const isJpeg = hex.startsWith("FFD8FF");
    const isPng = hex === "89504E47";
    const isWebp = hex === "52494646" && imageBuffer.subarray(8, 12).toString("hex").toUpperCase() === "57454250";

    if (!isJpeg && !isPng && !isWebp) {
      return jsonError("Format file tidak valid atau file palsu. Hanya mendukung JPEG, PNG, dan WebP.", 400);
    }
  }

  const parsed = createCareerJobSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    requirements: formString(formData, "requirements"),
    deadline: formString(formData, "deadline"),
    isOpen: formString(formData, "isOpen"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const job = await createCareerJob(parsed.data, imageBuffer ? { buffer: imageBuffer } : undefined);
    return jsonSuccess(job, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Missing Cloudinary env")) {
      return jsonError("Cloudinary belum dikonfigurasi.", 500);
    }
    console.error("/api/hr/careers POST error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
