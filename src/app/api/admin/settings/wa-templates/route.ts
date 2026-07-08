import { ZodError } from "zod";
import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { SettingsUseCase } from "@/application/use-cases/settings/settings.usecase";

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  try {
    const data = await SettingsUseCase.getWaTemplatesAction();
    return jsonSuccess(data);
  } catch (e) {
    console.error("[GET /api/admin/settings/wa-templates]", e);
    return jsonError("Gagal mengambil template WA.", 500);
  }
}

export async function PUT(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  try {
    const data = await SettingsUseCase.updateWaTemplatesAction(
      authResult.userId,
      json ?? {},
    );
    return jsonSuccess(data);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonValidationError(e);
    }
    console.error("[PUT /api/admin/settings/wa-templates]", e);
    return jsonError("Gagal memperbarui template WA.", 500);
  }
}
