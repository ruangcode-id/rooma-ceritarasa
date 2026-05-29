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
    const data = await SettingsUseCase.getEmailTemplatesAction();
    return jsonSuccess(data);
  } catch (e) {
    console.error("[GET /api/admin/settings/email-templates]", e);
    return jsonError("Gagal mengambil template email.", 500);
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
    const data = await SettingsUseCase.updateEmailTemplatesAction(
      authResult.userId,
      json ?? {},
    );
    return jsonSuccess(data);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonValidationError(e);
    }
    console.error("[PUT /api/admin/settings/email-templates]", e);
    return jsonError("Gagal memperbarui template email.", 500);
  }
}
