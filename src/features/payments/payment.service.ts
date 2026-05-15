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
import { PaymentStatus as DbPaymentStatus, PaymentType as DbPaymentType } from "@/generated/prisma/client";

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

function mapDbPaymentTypeToReservation(type: DbPaymentType): ReservationPaymentType {
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

  const dbStatus = query.status ?? undefined;
  const result = await paymentRepository.listPayments({
    skip,
    take: limit,
    status: dbStatus,
    orderId: query.orderId,
  });

  return {
    data: result.rows.map(toPaymentRecord),
    total: result.total,
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
  const isRefundEligible =
    transactionStatus === "settlement" || transactionStatus === "capture";

  if (!isRefundEligible) {
    throw new Error(
      `Transaction is not eligible for refund. Current Midtrans status: ${transactionStatus || "unknown"}`
    );
  }
  const refundPayload: Record<string, unknown> = {
    reason: "Refund by admin",
  };

  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    refundPayload.amount = Math.round(amount);
  }

  await core.transaction.refund(midtransOrderId, refundPayload);

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
  const status = mapMidtransStatus(payload.transaction_status, payload.fraud_status);
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

  return {
    ...toPaymentRecord(updated),
    amount: Number(payload.gross_amount),
    raw: payload,
  };
}
