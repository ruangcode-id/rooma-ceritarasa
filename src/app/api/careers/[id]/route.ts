import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { getPublicCareerJob } from "@/features/careers/career.service";

const idSchema = z.string().uuid("id harus berupa UUID yang valid.");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonValidationError(parsedId.error);
  }

  try {
    const job = await getPublicCareerJob(parsedId.data);
    if (!job) {
      return jsonError("Lowongan tidak ditemukan atau sudah ditutup.", 404);
    }

    return jsonSuccess(job);
  } catch (error: unknown) {
    console.error(`/api/careers/${parsedId.data} GET error:`, error);
    return jsonError("Internal Server Error", 500);
  }
}
