import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { updateCareerJobSchema } from "@/features/careers/career.validation";
import {
  closeCareerJob,
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
  const authResult = await requireAdminApiSession();
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  if (!hasUpdateValue(json)) {
    return jsonError("Minimal satu field harus diisi.", 400);
  }

  const parsed = updateCareerJobSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError("Minimal satu field harus diisi.", 400);
  }

  try {
    const job = await updateCareerJob(parsedId.data, parsed.data);
    return jsonSuccess(job);
  } catch (error: unknown) {
    const mappedError = mapCareerError(error);
    if (mappedError) return mappedError;

    console.error(`/api/admin/careers/${parsedId.data} PUT error:`, error);
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
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  try {
    const job = await closeCareerJob(parsedId.data);
    return jsonSuccess(job);
  } catch (error: unknown) {
    const mappedError = mapCareerError(error);
    if (mappedError) return mappedError;

    console.error(`/api/admin/careers/${parsedId.data} DELETE error:`, error);
    return jsonError("Internal Server Error", 500);
  }
}
