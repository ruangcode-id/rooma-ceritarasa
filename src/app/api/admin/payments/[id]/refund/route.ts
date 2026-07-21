import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { requireAdminApiSession } from "@/lib/require-admin-api";
import { prisma } from "@/infrastructure/database/prisma";
import { refundPayment } from "@/features/payments/payment.service";
import { PaymentStatus } from "@/generated/prisma/client";

type RouteCtx = { params: Promise<{ id: string }> };

type RefundBody = {
  type?: unknown;
  reason?: unknown;
};

const idParamSchema = z.string().uuid();

export async function POST(request: Request, context: RouteCtx) {
  const authResult = await requireAdminApiSession();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError("Payment ID tidak valid.", 400);
  }

  let json: RefundBody | null = null;
  try {
    json = (await request.json()) as RefundBody;
  } catch {
    return jsonError("Body harus berupa JSON.", 400);
  }

  if (!json || typeof json.type !== "string") {
    return jsonError("Refund type tidak valid.", 400);
  }

  if (json.type !== "full" && json.type !== "partial") {
    return jsonError("Refund type tidak valid.", 400);
  }

  if (json.type === "partial") {
    return jsonError("Partial refund belum didukung.", 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { id: idParsed.data },
  });

  if (!payment) {
    return jsonError("Payment tidak ditemukan.", 404);
  }

  if (payment.status !== PaymentStatus.paid) {
    return jsonError("Payment belum berstatus paid.", 400);
  }

  try {
    const refundResult = await refundPayment(payment.midtransOrderId ?? payment.id);

    return jsonSuccess({
      id: payment.id,
      orderId: refundResult.orderId,
      status: "refunded",
      type: json.type,
      amount: refundResult.amount,
    });
  } catch (error: unknown) {
    console.error("API [Admin Payment Refund] Error:", error);
    return jsonError("Terjadi kesalahan internal pada server.", 500);
  }
}
