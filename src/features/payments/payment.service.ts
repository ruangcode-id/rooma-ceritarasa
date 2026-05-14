import { getMidtransSnap } from "@/lib/midtrans";
import {
  CreatePaymentInput,
  CreatePaymentResult,
  MidtransWebhookPayload,
  PaymentListQuery,
  PaymentRecord,
  PaymentStatus,
  ReservationPaymentType,
} from "./payment.types";
import { generateOrderId, mapMidtransPaymentType, mapMidtransStatus } from "./payment.utils";
import { paymentRepository } from "@/infrastructure/repositories/payment.repository";
import { PaymentStatus as DbPaymentStatus, PaymentType as DbPaymentType } from "@/generated/prisma/client";

function mapFeatureStatusToDb(status: PaymentStatus): DbPaymentStatus {
  switch (status) {
    case PaymentStatus.Success:
      return "paid";
    case PaymentStatus.Failed:
    case PaymentStatus.Expired:
    case PaymentStatus.Canceled:
      return "failed";
    case PaymentStatus.Refunded:
      return "refunded";
    case PaymentStatus.Pending:
    default:
      return "pending";
  }
}

function mapDbStatusToFeature(status: DbPaymentStatus): PaymentStatus {
  switch (status) {
    case "paid":
      return PaymentStatus.Success;
    case "failed":
      return PaymentStatus.Failed;
    case "refunded":
      return PaymentStatus.Refunded;
    case "pending":
    default:
      return PaymentStatus.Pending;
  }
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

function toPaymentRecord(entity: {
  id: string;
  midtransOrderId: string | null;
  status: DbPaymentStatus;
  paymentMethod: string | null;
  amount: number;
}): PaymentRecord {
  return {
    orderId: entity.midtransOrderId ?? entity.id,
    status: mapDbStatusToFeature(entity.status),
    type: mapMidtransPaymentType(entity.paymentMethod ?? undefined),
    amount: entity.amount,
  };
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  const orderId = input.orderId ?? generateOrderId();
  const amount = Math.round(input.amount);

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

  const dbStatus = query.status ? mapFeatureStatusToDb(query.status) : undefined;
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
  const updated = await paymentRepository.updateStatusByOrderId(
    orderId,
    mapFeatureStatusToDb(status)
  );

  if (!updated) {
    throw new Error("Payment not found");
  }

  return toPaymentRecord(updated);
}

export async function refundPayment(
  orderId: string,
  amount?: number
): Promise<PaymentRecord> {
  const updated = await paymentRepository.refundByOrderId(orderId);

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
  const dbStatus = mapFeatureStatusToDb(status);
  const paidAt = dbStatus === "paid" ? new Date() : null;

  const updated = await paymentRepository.updateFromWebhook({
    orderId: payload.order_id,
    status: dbStatus,
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
