import { z } from "zod";
import { jsonError, jsonSuccess, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { getAdminCareerApplication } from "@/features/careers/career.service";

const idSchema = z.string().uuid("id harus berupa UUID yang valid.");

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
    const application = await getAdminCareerApplication(parsedId.data);
    if (!application) {
      return jsonError("Lamaran tidak ditemukan.", 404);
    }

    return jsonSuccess(application);
  } catch (error: unknown) {
    console.error(
      `/api/admin/careers/applications/${parsedId.data} GET error:`,
      error,
    );
    return jsonError("Internal Server Error", 500);
  }
}
