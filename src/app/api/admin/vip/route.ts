import { NextResponse } from "next/server";
import { jsonError, jsonValidationError } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { listVipCards } from "@/features/vip/vip.service";
import { adminVipListQuerySchema } from "@/features/vip/vip.validation";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const parsed = adminVipListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  try {
    const result = await listVipCards(parsed.data);
    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    console.error("/api/admin/vip GET error:", error);
    return jsonError("Internal Server Error", 500);
  }
}
