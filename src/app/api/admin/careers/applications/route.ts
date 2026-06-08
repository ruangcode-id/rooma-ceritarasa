import {
  jsonError,
  jsonSuccessList,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { adminCareerApplicationListQuerySchema } from "@/features/careers/career.validation";
import { listAdminCareerApplications } from "@/features/careers/career.service";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const parsed = adminCareerApplicationListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const result = await listAdminCareerApplications(parsed.data);
    return jsonSuccessList(result.data, result.meta);
  } catch (error: unknown) {
    console.error("/api/admin/careers/applications GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
