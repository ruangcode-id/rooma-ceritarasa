import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { listPayments } from "@/features/payments/payment.service";
import { PaymentStatus } from "@/features/payments/payment.types";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApiSession();
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const orderId = searchParams.get("orderId") ?? undefined;
    const statusParam = searchParams.get("status");

    const status = Object.values(PaymentStatus).includes(statusParam as PaymentStatus)
      ? (statusParam as PaymentStatus)
      : undefined;

    const result = await listPayments({ page, limit, status, orderId });

    const totalPages = limit > 0 ? Math.ceil(result.total / limit) : 1;

    return jsonSuccess({
      data: result.data,
      summary: result.summary,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      },
    });
  } catch (error: unknown) {
    console.error("API [Admin Payments] Error:", error);
    return jsonError("Terjadi kesalahan internal pada server.", 500);
  }
}
