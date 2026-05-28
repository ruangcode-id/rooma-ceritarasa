import { jsonError, jsonSuccessList, jsonValidationError } from "@/lib/api-envelope";
import { publicCareerListQuerySchema } from "@/features/careers/career.validation";
import { listPublicCareerJobs } from "@/features/careers/career.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicCareerListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const result = await listPublicCareerJobs(parsed.data);
    return jsonSuccessList(result.data, result.meta);
  } catch (error: unknown) {
    console.error("/api/careers GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
