import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { getPublicVipCardByToken } from "@/features/vip/vip.service";

const tokenParamSchema = z.string().trim().min(1).max(200);

type RouteCtx = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteCtx) {
  const { token } = await context.params;
  const parsed = tokenParamSchema.safeParse(token);

  if (!parsed.success) {
    return jsonError("Token tidak valid.", 400);
  }

  try {
    const card = await getPublicVipCardByToken(parsed.data);

    if (!card) {
      return jsonError("VIP card tidak ditemukan atau tidak aktif.", 404);
    }

    return jsonSuccess(card);
  } catch (error: unknown) {
    console.error("/api/vip/[token] GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
