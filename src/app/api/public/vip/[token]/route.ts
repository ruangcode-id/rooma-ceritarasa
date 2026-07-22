import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { getPublicVipCardByToken } from "@/features/vip/vip.service";

// Minimal 20 karakter untuk menolak token pendek lama (RVIP-A8B9C2 = 11 karakter)
const tokenParamSchema = z.string().trim().min(20).max(200);

type RouteCtx = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteCtx) {
  const { token } = await context.params;
  const parsed = tokenParamSchema.safeParse(token);

  if (!parsed.success) {
    return jsonError("Token tidak valid atau terlalu pendek.", 400);
  }

  try {
    const card = await getPublicVipCardByToken(parsed.data);

    if (!card) {
      return jsonError("Token VIP tidak valid atau sudah tidak aktif.", 404);
    }

    return jsonSuccess(card);
  } catch (error: unknown) {
    console.error("[GET VIP BY TOKEN ERROR]", error);
    return jsonError("Internal Server Error", 500);
  }
}
