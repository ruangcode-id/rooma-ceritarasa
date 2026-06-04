import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-envelope";
import { prisma } from "@/infrastructure/database/prisma";
import {
  PaymentStatus,
  ReservationStatus,
  EventPaymentStatus,
  EventRequestStatus,
} from "@/generated/prisma/client";
import { verifySignature } from "@/features/payments/payment.utils";
import { eventNotificationService } from "@/infrastructure/services/notification.service";
import { notifyStaffPaymentConfirmed } from "@/infrastructure/payment/payment-confirmed.notify";
import {
  notifyGuestPaymentSuccess,
  notifyGuestReservationConfirmed,
} from "@/infrastructure/notifications/guest-notification.service";

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
  const status = transactionStatus?.toLowerCase();
  const fraud = fraudStatus?.toLowerCase();

  if (status === "capture") {
    return fraud === "challenge" ? PaymentStatus.pending : PaymentStatus.paid;
  }

  if (status === "settlement" || status === "paid") {
    return PaymentStatus.paid;
  }

  if (status === "pending") {
    return PaymentStatus.pending;
  }

  if (
    status === "deny" ||
    status === "cancel" ||
    status === "expire" ||
    status === "failure"
  ) {
    return PaymentStatus.failed;
  }

  if (status === "refund" || status === "partial_refund") {
    return PaymentStatus.refunded;
  }

  return PaymentStatus.pending;
}

function shouldConfirmReservation(
  paymentStatus: PaymentStatus,
  payload: MidtransWebhookPayload
) {
  const status = payload.transaction_status?.toLowerCase();
  const fraud = payload.fraud_status?.toLowerCase();

  if (status === "settlement" || status === "paid") {
    return true;
  }

  if (status === "capture") {
    return fraud !== "challenge" && paymentStatus === PaymentStatus.paid;
  }

  return false;
}

function shouldCancelPendingReservation(paymentStatus: PaymentStatus) {
  return paymentStatus === PaymentStatus.failed;
}

function getPaidAt(paymentStatus: PaymentStatus, payload: MidtransWebhookPayload) {
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

function mapMidtransStatusToEventPaymentStatus(
  transactionStatus?: string,
  fraudStatus?: string
): EventPaymentStatus {
  const status = transactionStatus?.toLowerCase();
  const fraud = fraudStatus?.toLowerCase();

  if (status === "capture") {
    return fraud === "challenge" ? EventPaymentStatus.pending : EventPaymentStatus.paid;
  }
  if (status === "settlement" || status === "paid") return EventPaymentStatus.paid;
  if (status === "pending") return EventPaymentStatus.pending;
  return EventPaymentStatus.failed;
}

async function handleEventPaymentWebhook(
  orderId: string,
  payload: MidtransWebhookPayload
) {
  const eventPaymentStatus = mapMidtransStatusToEventPaymentStatus(
    payload.transaction_status,
    payload.fraud_status
  );

  const paidAt =
    eventPaymentStatus === EventPaymentStatus.paid
      ? (payload.settlement_time
          ? new Date(payload.settlement_time)
          : payload.transaction_time
          ? new Date(payload.transaction_time)
          : new Date())
      : null;

  // Cari EventPayment berdasarkan paymentMethod yang disimpan sebagai "midtrans:<orderId>"
  const eventPayment = await prisma.eventPayment.findFirst({
    where: { paymentMethod: `midtrans:${orderId}` },
    include: {
      eventRequest: {
        include: {
          guest: { select: { name: true, phone: true, email: true } },
        },
      },
    },
  });

  if (!eventPayment) {
    return null; // Bukan event payment, skip
  }

  const updatedEventPayment = await prisma.eventPayment.update({
    where: { id: eventPayment.id },
    data: {
      status: eventPaymentStatus,
      ...(paidAt ? { paidAt } : {}),
      paymentMethod: `midtrans:${orderId}`,
    },
  });

  let eventRequestStatus: string = eventPayment.eventRequest.status;

  // Jika DP terbayar, otomatis ubah status EventRequest jadi 'accepted'
  if (eventPaymentStatus === EventPaymentStatus.paid) {
    const updatedRequest = await prisma.eventRequest.update({
      where: { id: eventPayment.eventRequestId },
      data: { status: EventRequestStatus.accepted },
    });
    eventRequestStatus = updatedRequest.status;

    // Trigger notifikasi event_accepted untuk Dev C (fire & forget)
    eventNotificationService
      .triggerEventNotification({
        type: "event_accepted",
        eventRequestId: eventPayment.eventRequestId,
        picName: eventPayment.eventRequest.guest.name,
        picPhone: eventPayment.eventRequest.guest.phone,
        picEmail: eventPayment.eventRequest.guest.email ?? null,
        eventDate: eventPayment.eventRequest.eventDate,
      })
      .catch((err) => console.error("[midtrans-webhook] event notification failed:", err));
  }

  return {
    type: "event_payment",
    orderId,
    eventPaymentId: updatedEventPayment.id,
    eventPaymentStatus: updatedEventPayment.status,
    eventRequestId: eventPayment.eventRequestId,
    eventRequestStatus,
  };
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

    // ── Cek apakah ini EventPayment terlebih dahulu ────────────────────────────
    const eventPaymentResult = await handleEventPaymentWebhook(orderId, payload);
    if (eventPaymentResult !== null) {
      return jsonSuccess(eventPaymentResult);
    }

    // ── Fallback: handle Reservation Payment (flow lama) ──────────────────────
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
        include: {
          reservation: true,
        },
      });

      if (!payment) {
        throw new Error(`Payment not found for order ID: ${orderId}`);
      }

      const updateData = {
        status: paymentStatus,
        ...(paymentStatus === PaymentStatus.paid ? { paidAt } : {}),
      };

      if (paymentStatus === PaymentStatus.refunded) {
        console.info("[midtrans-webhook] refund BEFORE", {
          paymentId: payment.id,
          orderId,
          status: payment.status,
          paidAt: payment.paidAt,
        });
        console.info("[midtrans-webhook] refund UPDATE", updateData);
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: updateData,
      });

      if (paymentStatus === PaymentStatus.refunded) {
        console.info("[midtrans-webhook] refund AFTER", {
          paymentId: updatedPayment.id,
          status: updatedPayment.status,
          paidAt: updatedPayment.paidAt,
        });
      }

      let reservationStatus: ReservationStatus | "unchanged" = "unchanged";

      if (shouldConfirmReservation(paymentStatus, payload)) {
        const updatedReservation = await tx.reservation.update({
          where: {
            id: payment.reservationId,
          },
          data: {
            status: ReservationStatus.confirmed,
            expiresAt: null,
          },
        });

        reservationStatus = updatedReservation.status;
      }

      if (
        shouldCancelPendingReservation(paymentStatus) &&
        payment.reservation.status === ReservationStatus.pending
      ) {
        const paidPayment = await tx.payment.findFirst({
          where: {
            reservationId: payment.reservationId,
            status: PaymentStatus.paid,
          },
        });

        if (!paidPayment) {
          const updatedReservation = await tx.reservation.update({
            where: {
              id: payment.reservationId,
            },
            data: {
              status: ReservationStatus.cancelled,
            },
          });

          reservationStatus = updatedReservation.status;
        }
      }

      return {
        type: "reservation_payment",
        orderId,
        paymentId: updatedPayment.id,
        paymentStatus: updatedPayment.status,
        reservationId: payment.reservationId,
        reservationStatus,
        paymentAmount: updatedPayment.amount,
        paymentType: updatedPayment.type,
      };
    });

    if (
      result.type === "reservation_payment" &&
      result.reservationStatus === ReservationStatus.confirmed
    ) {
      const detail = `Pembayaran ${result.paymentType} Rp ${Number(result.paymentAmount).toLocaleString("id-ID")}`;
      notifyStaffPaymentConfirmed({
        reservationId: result.reservationId,
        detail,
      }).catch((err) => console.error("[midtrans-webhook] staff notify failed:", err));

      notifyGuestPaymentSuccess(result.reservationId).catch((err) =>
        console.error("[midtrans-webhook] guest payment notify failed:", err),
      );
      notifyGuestReservationConfirmed(result.reservationId).catch((err) =>
        console.error("[midtrans-webhook] guest confirm notify failed:", err),
      );
    }

    return jsonSuccess(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return jsonError(message, 500);
  }
}