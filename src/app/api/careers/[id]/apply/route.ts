import { z } from "zod";
import { NextResponse } from "next/server";
import { jsonError, jsonValidationError } from "@/lib/api-envelope";
import { applyCareerSchema } from "@/features/careers/career.validation";
import { createCareerApplication } from "@/features/careers/career.service";
import {
  notifyAdminNewApplication,
  sendApplicationConfirmation,
} from "@/features/careers/career-email.service";
import rateLimit from "@/lib/rate-limit";
import { headers } from "next/headers";

export const runtime = "nodejs";

const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 3600000 }); // 1 jam

const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024;
const idSchema = z.string().uuid("id harus berupa UUID yang valid.");

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

function isPdfFile(file: File) {
  return file.type === "application/pdf" && file.name.toLowerCase().endsWith(".pdf");
}

function mapRuntimeError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "CAREER_JOB_CLOSED_OR_NOT_FOUND") {
      return jsonError("Lowongan tidak ditemukan atau sudah ditutup.", 404);
    }

    if (error.message.startsWith("Missing Cloudinary env")) {
      return jsonError("Cloudinary belum dikonfigurasi.", 500);
    }
  }

  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  try {
    await limiter.check(3, `apply_${ip}`);
  } catch {
    return jsonError("Terlalu banyak permintaan lamaran kerja. Silakan coba lagi nanti.", 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Body harus berupa multipart/form-data.", 400);
  }

  const cv = formData.get("cv");
  if (!isUploadFile(cv) || cv.size === 0) {
    return jsonError("cv wajib diisi.", 400);
  }

  if (!isPdfFile(cv)) {
    return jsonError("CV harus berupa file PDF.", 400);
  }

  if (cv.size > MAX_CV_SIZE_BYTES) {
    return jsonError("Ukuran CV maksimal 5MB.", 400);
  }

  const parsed = applyCareerSchema.safeParse({
    applicantName: formString(formData, "applicantName"),
    applicantEmail: formString(formData, "applicantEmail"),
    applicantPhone: formString(formData, "applicantPhone"),
    coverLetter: formString(formData, "coverLetter"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const buffer = Buffer.from(await cv.arrayBuffer());
    
    // Check Magic Bytes untuk PDF (%PDF-)
    const isPdfMagic = buffer.subarray(0, 5).toString("hex").toUpperCase() === "255044462D";
    if (!isPdfMagic) {
      return jsonError("Format file tidak valid atau file PDF palsu.", 400);
    }

    const application = await createCareerApplication(parsedId.data, parsed.data, {
      buffer,
    });

    const [confirmationResult, adminNotificationResult] = await Promise.all([
      sendApplicationConfirmation(application),
      notifyAdminNewApplication(application),
    ]);
    const warning =
      "warning" in confirmationResult
        ? confirmationResult.warning
        : "warning" in adminNotificationResult
          ? adminNotificationResult.warning
          : undefined;

    return NextResponse.json(
      {
        success: true,
        data: application,
        email: {
          confirmationSent: confirmationResult.sent,
          adminNotificationSent: adminNotificationResult.sent,
          ...(warning ? { warning } : {}),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const mappedError = mapRuntimeError(error);
    if (mappedError) return mappedError;

    console.error(`/api/careers/${parsedId.data}/apply POST error:`, error);
    return jsonError("Internal Server Error", 500);
  }
}
