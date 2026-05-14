import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, jsonSuccessList } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import {
  listPayments,
  refundPayment,
  updatePaymentStatus,
} from "@/features/payments/payment.service";
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

    return jsonSuccessList(result.data, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
      hasNext: result.page * result.limit < result.total,
      hasPrev: result.page > 1,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonError(message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdminApiSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.orderId !== "string") {
      return jsonError("Missing orderId", 400);
    }

    if (body.refund) {
      const amount = typeof body.refund.amount === "number" ? body.refund.amount : undefined;
      const result = await refundPayment(body.orderId, amount);
      return jsonSuccess(result);
    }

    if (!body.status) {
      return jsonError("Missing status", 400);
    }

    const result = await updatePaymentStatus(body.orderId, body.status);
    return jsonSuccess(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonError(message, 500);
  }
}
