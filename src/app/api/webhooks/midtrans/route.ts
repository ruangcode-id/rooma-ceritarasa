import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { prisma } from "@/infrastructure/database/prisma";
import { PaymentStatus, ReservationStatus } from "@/generated/prisma/client";
import { verifySignature } from "@/features/payments/payment.utils";

type MidtransWebhookPayload = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  gross_amount?: string;
  signature_key?: string;
  status_code?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
};

function mapMidtransStatusToPaymentStatus(
  transactionStatus?: string,
  fraudStatus?: string
): PaymentStatus {
  if (transactionStatus === "capture") {
    if (fraudStatus === "challenge") {
      return PaymentStatus.pending;
    }

    return PaymentStatus.paid;
  }

  if (transactionStatus === "settlement") {
    return PaymentStatus.paid;
  }

  if (transactionStatus === "paid") {
    return PaymentStatus.paid;
  }

  if (transactionStatus === "pending") {
    return PaymentStatus.pending;
  }

  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure"
  ) {
    return PaymentStatus.failed;
  }

  if (
    transactionStatus === "refund" ||
    transactionStatus === "partial_refund"
  ) {
    return PaymentStatus.refunded;
  }

  return PaymentStatus.pending;
}

function shouldConfirmReservation(
  paymentStatus: PaymentStatus,
  payload: MidtransWebhookPayload
) {
  const transactionStatus = payload.transaction_status?.toLowerCase();

  if (!transactionStatus) {
    return paymentStatus === PaymentStatus.paid;
  }

  if (transactionStatus === "settlement" || transactionStatus === "paid") {
    return true;
  }

  if (transactionStatus === "capture") {
    return payload.fraud_status !== "challenge";
  }

  return false;
}

function getPaidAt(
  paymentStatus: PaymentStatus,
  payload: MidtransWebhookPayload
) {
  if (paymentStatus !== PaymentStatus.paid) {
    return null;
  }

  if (payload.settlement_time) {
    return new Date(payload.settlement_time);
  }

  if (payload.transaction_time) {
    return new Date(payload.transaction_time);
  }

  return new Date();
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => null)) as
      | MidtransWebhookPayload
      | null;

    if (!payload) {
      return jsonError("Invalid payload", 400);
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";

    if (!serverKey) {
      return jsonError("MIDTRANS_SERVER_KEY is not configured", 500);
    }

    if (!verifySignature(payload, serverKey)) {
      return jsonError("Invalid signature", 401);
    }

    const orderId = payload.order_id;

    if (!orderId) {
      return jsonError("Midtrans order_id is required", 400);
    }

    const paymentStatus = mapMidtransStatusToPaymentStatus(
      payload.transaction_status,
      payload.fraud_status
    );

    const paidAt = getPaidAt(paymentStatus, payload);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          midtransOrderId: orderId,
        },
      });

      if (!payment) {
        throw new Error(`Payment not found for order ID: ${orderId}`);
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: paymentStatus,
          paidAt,
        },
      });

      let updatedReservation = null;

      if (shouldConfirmReservation(paymentStatus, payload)) {
        updatedReservation = await tx.reservation.update({
          where: {
            id: payment.reservationId,
          },
          data: {
            status: ReservationStatus.confirmed,
          },
        });
      }

      return {
        orderId,
        paymentId: updatedPayment.id,
        paymentStatus: updatedPayment.status,
        reservationId: payment.reservationId,
        reservationStatus:
          updatedReservation?.status ??
          "unchanged",
      };
    });

    return jsonSuccess(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return jsonError(message, 500);
  }
}