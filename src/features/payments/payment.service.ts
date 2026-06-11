import { getMidtransCore, getMidtransSnap } from "@/lib/midtrans";
import { z } from "zod";
import {
  CreatePaymentInput,
  CreatePaymentResult,
  MidtransWebhookPayload,
  PaymentListQuery,
  PaymentRecord,
  PaymentStatus,
  ReservationPaymentType,
} from "./payment.types";
import { generateOrderId, mapMidtransStatus } from "./payment.utils";
import { paymentRepository } from "@/infrastructure/repositories/payment.repository";
import { prisma } from "@/infrastructure/database/prisma";
import {
  PaymentStatus as DbPaymentStatus,
  PaymentType as DbPaymentType,
} from "@/generated/prisma/client";

function mapDbStatusToFeature(status: DbPaymentStatus): PaymentStatus {
  return status as PaymentStatus;
}

function mapReservationPaymentType(type: ReservationPaymentType): DbPaymentType {
  switch (type) {
    case ReservationPaymentType.Deposit:
      return "deposit";
    case ReservationPaymentType.Full:
      return "full";
    default:
      return "deposit";
  }
}

function mapDbPaymentTypeToReservation(
  type: DbPaymentType
): ReservationPaymentType {
  switch (type) {
    case "full":
      return ReservationPaymentType.Full;
    case "deposit":
    default:
      return ReservationPaymentType.Deposit;
  }
}

function toPaymentRecord(entity: {
  id: string;
  midtransOrderId: string | null;
  status: DbPaymentStatus;
  type: DbPaymentType;
  amount: number;
}): PaymentRecord {
  return {
    orderId: entity.midtransOrderId ?? entity.id,
    status: mapDbStatusToFeature(entity.status),
    type: mapDbPaymentTypeToReservation(entity.type),
    amount: entity.amount,
  };
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  const orderId = input.orderId ?? generateOrderId();
  const amount = Math.round(input.amount);

  try {
    z.string().uuid().parse(input.reservationId);
  } catch {
    throw new Error("Invalid reservationId");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const snap = getMidtransSnap();

  await paymentRepository.createPayment({
    reservationId: input.reservationId,
    type: mapReservationPaymentType(input.paymentType),
    amount,
    status: "pending",
    midtransOrderId: orderId,
  });

  let transaction;

  try {
    transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: input.customer,
      item_details: input.items,
      metadata: input.metadata,
    });
  } catch (error) {
    await paymentRepository.updateStatusByOrderId(orderId, "failed");
    throw error;
  }

  return {
    orderId,
    token: transaction.token,
    redirectUrl: transaction.redirect_url,
  };
}

export async function listPayments(query: PaymentListQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(query.status ? { status: query.status as DbPaymentStatus } : {}),
    ...(query.orderId
      ? {
          midtransOrderId: {
            contains: query.orderId,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        reservation: {
          include: {
            guest: true,
            session: true,
          },
        },
      },
    }),
    prisma.payment.count({
      where,
    }),
  ]);

  return {
    data: rows.map((payment) => ({
      orderId: payment.midtransOrderId ?? payment.id,
      status: mapDbStatusToFeature(payment.status),
      type: mapDbPaymentTypeToReservation(payment.type),
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      reservation: {
        id: payment.reservation.id,
        date: payment.reservation.date,
        partySize: payment.reservation.partySize,
        status: payment.reservation.status,
        guest: {
          id: payment.reservation.guest.id,
          name: payment.reservation.guest.name,
          phone: payment.reservation.guest.phone,
          email: payment.reservation.guest.email,
        },
        session: {
          id: payment.reservation.session.id,
          name: payment.reservation.session.name,
          startTime: payment.reservation.session.startTime,
          endTime: payment.reservation.session.endTime,
          maxCapacity: payment.reservation.session.maxCapacity,
        },
      },
    })),
    total,
    page,
    limit,
  };
}

export async function updatePaymentStatus(
  orderId: string,
  status: PaymentStatus
): Promise<PaymentRecord> {
  const updated = await paymentRepository.updateStatusByOrderId(orderId, status);

  if (!updated) {
    throw new Error("Payment not found");
  }

  return toPaymentRecord(updated);
}

export async function refundPayment(
  orderId: string,
  amount?: number
): Promise<PaymentRecord> {
  const payment = await paymentRepository.findByOrderId(orderId);

  if (!payment) {
    throw new Error("Payment not found");
  }

  const midtransOrderId = payment.midtransOrderId ?? payment.id;
  const core = getMidtransCore();
  const midtransStatus = await core.transaction.status(midtransOrderId);
  const transactionStatus = String(midtransStatus?.transaction_status ?? "");
  const fraudStatus = String(midtransStatus?.fraud_status ?? "");

  const isRefundEligible =
    transactionStatus === "settlement" ||
    (transactionStatus === "capture" && fraudStatus === "accept");

  if (!isRefundEligible) {
    throw new Error(
      `Transaction is not eligible for refund. Current Midtrans status: ${
        transactionStatus || "unknown"
      }`
    );
  }

  const refundPayload: Record<string, unknown> = {
    reason: "Refund by admin",
  };

  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    refundPayload.amount = Math.round(amount);
  }

  try {
    await core.transaction.refund(midtransOrderId, refundPayload);
  } catch {
    throw new Error("Refund request rejected by Midtrans Sandbox");
  }

  console.info("[refund] Midtrans refund requested", {
    orderId: midtransOrderId,
    amount,
  });

  const updated = await paymentRepository.refundByOrderId(midtransOrderId);

  if (!updated) {
    throw new Error("Payment not found");
  }

  return {
    ...toPaymentRecord(updated),
    amount: amount ?? updated.amount,
  };
}

export async function handleMidtransWebhook(
  payload: MidtransWebhookPayload
): Promise<PaymentRecord> {
  const status = mapMidtransStatus(
    payload.transaction_status,
    payload.fraud_status
  );

  const paidAt = status === "paid" ? new Date() : null;

  const updated = await paymentRepository.updateFromWebhook({
    orderId: payload.order_id,
    status,
    paymentMethod: payload.payment_type ?? null,
    midtransTxnId: payload.transaction_id ?? null,
    paidAt,
  });

  if (!updated) {
    throw new Error("Payment not found");
  }

  if (status === "paid") {
    const { notifyStaffPaymentConfirmed } = await import(
      "@/infrastructure/payment/payment-confirmed.notify"
    );
    await notifyStaffPaymentConfirmed({
      reservationId: updated.reservationId,
      detail: `Pembayaran ${updated.type} dikonfirmasi`,
    });
  }

  return {
    ...toPaymentRecord(updated),
    amount: Number(payload.gross_amount),
    raw: payload,
  };
}
