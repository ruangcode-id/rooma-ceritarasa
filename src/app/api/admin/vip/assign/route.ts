import {
  jsonError,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { assignVipCardSchema } from "@/features/vip/vip.validation";
import { assignVipCard } from "@/features/vip/vip.service";

function isPrismaUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
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

  const parsed = assignVipCardSchema.safeParse(json);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const card = await assignVipCard(parsed.data);
    return jsonSuccess(card, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "GUEST_NOT_FOUND") {
        return jsonError("Tamu tidak ditemukan.", 404);
      }

      if (error.message === "ACTIVE_VIP_CARD_EXISTS") {
        return jsonError("Tamu sudah memiliki VIP card aktif.", 409);
      }

      if (error.message === "VIP_CARD_EXISTS") {
        return jsonError("Tamu sudah memiliki VIP card.", 409);
      }
    }

    if (isPrismaUniqueViolation(error)) {
      return jsonError("VIP card untuk tamu atau token ini sudah ada.", 409);
    }

    console.error("/api/admin/vip/assign POST error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
