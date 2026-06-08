import {
  jsonError,
  jsonSuccess,
  jsonSuccessList,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  adminCareerListQuerySchema,
  createCareerJobSchema,
} from "@/features/careers/career.validation";
import {
  createCareerJob,
  listAdminCareerJobs,
} from "@/features/careers/career.service";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
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

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  const parsed = createCareerJobSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const job = await createCareerJob(parsed.data);
    return jsonSuccess(job, { status: 201 });
  } catch (error: unknown) {
    console.error("/api/admin/careers POST error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
