import { getMidtransCore, getMidtransSnap } from "@/lib/midtrans";
import { z } from "zod";
import { MIDTRANS_STATUS_MAP } from "./payment.constants";
import {
  CreatePaymentInput,
  CreatePaymentResult,
  MidtransWebhookPayload,
  BulkPaymentSyncResult,
  PaymentListQuery,
  PaymentRecord,
  PaymentSummary,
  PaymentSyncResult,
  PaymentStatus,
  ReservationPaymentType,
} from "./payment.types";
import { generateOrderId, mapMidtransStatus } from "./payment.utils";
import { paymentRepository } from "@/infrastructure/repositories/payment.repository";
import { prisma } from "@/infrastructure/database/prisma";
import {
  Prisma,
  PaymentStatus as DbPaymentStatus,
  ReservationStatus,
  PaymentType as DbPaymentType,
} from "@/generated/prisma/client";

type MidtransApiError = {
  httpStatusCode?: number | string;
  ApiResponse?: {
    status_code?: number | string;
    status_message?: string;
  };
};

class MidtransTransactionNotStartedError extends Error {
  constructor(orderId: string) {
    super(`Transaksi Midtrans ${orderId} belum dimulai oleh pelanggan.`);
    this.name = "MidtransTransactionNotStartedError";
  }
}

function isMidtransTransactionNotStarted(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const midtransError = error as MidtransApiError;
  const statusCode =
    midtransError.ApiResponse?.status_code ?? midtransError.httpStatusCode;

  return String(statusCode) === "404";
}

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

  const where: Prisma.PaymentWhereInput = {};

  if (query.status) {
    where.status = query.status as DbPaymentStatus;
  }

  if (query.orderId) {
    const search = query.orderId.trim();
    const filters: Prisma.PaymentWhereInput[] = [
      {
        midtransOrderId: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];

    if (z.string().uuid().safeParse(search).success) {
      filters.push({ id: search }, { reservationId: search });
    }

    where.OR = filters;
  }

  const [rows, total, paidAggregate, paidCount, pendingCount, refundedCount] =
    await Promise.all([
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
    prisma.payment.aggregate({
      where: { status: DbPaymentStatus.paid },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: DbPaymentStatus.paid } }),
    prisma.payment.count({ where: { status: DbPaymentStatus.pending } }),
    prisma.payment.count({ where: { status: DbPaymentStatus.refunded } }),
  ]);

  const summary: PaymentSummary = {
    paidRevenue: Number(paidAggregate._sum.amount ?? 0),
    paidCount,
    pendingCount,
    refundedCount,
  };

  return {
    data: rows.map((payment) => ({
      id: payment.id,
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
    summary,
  };
}

function getMidtransPaidAt(response: Record<string, unknown>) {
  const settlementTime =
    typeof response.settlement_time === "string"
      ? response.settlement_time
      : null;
  const transactionTime =
    typeof response.transaction_time === "string"
      ? response.transaction_time
      : null;
  const value = settlementTime ?? transactionTime;

  if (!value) return new Date();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function syncPaymentStatus(
  paymentId: string
): Promise<PaymentSyncResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      reservation: true,
    },
  });

  if (!payment) {
    throw new Error("Payment tidak ditemukan.");
  }

  if (!payment.midtransOrderId) {
    throw new Error("Payment tidak memiliki Midtrans order ID.");
  }

  const core = getMidtransCore();
  let midtransResponse: Record<string, unknown>;

  try {
    midtransResponse = (await core.transaction.status(
      payment.midtransOrderId
    )) as Record<string, unknown>;
  } catch (error) {
    if (isMidtransTransactionNotStarted(error)) {
      throw new MidtransTransactionNotStartedError(payment.midtransOrderId);
    }

    const midtransError =
      typeof error === "object" && error !== null
        ? (error as MidtransApiError)
        : null;

    console.error("[payment-sync] Midtrans status request failed", {
      paymentId: payment.id,
      orderId: payment.midtransOrderId,
      statusCode:
        midtransError?.ApiResponse?.status_code ??
        midtransError?.httpStatusCode ??
        null,
      message:
        midtransError?.ApiResponse?.status_message ??
        (error instanceof Error ? error.message : String(error)),
    });

    throw new Error(
      "Status transaksi tidak dapat diambil dari Midtrans. Coba lagi beberapa saat."
    );
  }

  const transactionStatus = String(
    midtransResponse.transaction_status ?? ""
  ).toLowerCase();
  const fraudStatus =
    typeof midtransResponse.fraud_status === "string"
      ? midtransResponse.fraud_status
      : undefined;

  if (!transactionStatus) {
    throw new Error("Midtrans tidak mengembalikan status transaksi.");
  }

  const isSupportedStatus =
    transactionStatus === "capture" ||
    Object.prototype.hasOwnProperty.call(
      MIDTRANS_STATUS_MAP,
      transactionStatus
    );

  if (!isSupportedStatus) {
    throw new Error(
      `Status Midtrans "${transactionStatus}" belum didukung untuk sinkronisasi.`
    );
  }

  const responseOrderId =
    typeof midtransResponse.order_id === "string"
      ? midtransResponse.order_id
      : null;

  if (!responseOrderId) {
    throw new Error("Midtrans tidak mengembalikan order ID transaksi.");
  }

  if (responseOrderId !== payment.midtransOrderId) {
    throw new Error("Order ID dari Midtrans tidak sesuai dengan payment lokal.");
  }

  const responseAmount = Number(midtransResponse.gross_amount);

  if (!Number.isFinite(responseAmount)) {
    throw new Error("Midtrans tidak mengembalikan nominal transaksi yang valid.");
  }

  if (Math.round(responseAmount) !== Math.round(Number(payment.amount))) {
    throw new Error(
      "Nominal transaksi Midtrans tidak sesuai dengan payment lokal."
    );
  }

  const nextStatus = mapMidtransStatus(transactionStatus, fraudStatus);
  const isTerminalFailure = ["cancel", "expire", "failure"].includes(
    transactionStatus
  );
  const paymentMethod =
    typeof midtransResponse.payment_type === "string"
      ? midtransResponse.payment_type
      : null;
  const transactionId =
    typeof midtransResponse.transaction_id === "string"
      ? midtransResponse.transaction_id
      : null;

  const result = await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { reservation: true },
    });

    if (!currentPayment) {
      throw new Error("Payment tidak ditemukan.");
    }

    const updatedPayment = await tx.payment.update({
      where: { id: currentPayment.id },
      data: {
        status: nextStatus as DbPaymentStatus,
        paymentMethod: paymentMethod ?? currentPayment.paymentMethod,
        midtransTxnId: transactionId ?? currentPayment.midtransTxnId,
        paidAt:
          nextStatus === PaymentStatus.Paid
            ? currentPayment.paidAt ?? getMidtransPaidAt(midtransResponse)
            : nextStatus === PaymentStatus.Refunded
              ? currentPayment.paidAt
              : null,
      },
    });

    let reservationStatus = currentPayment.reservation.status;
    let reservationStatusChanged = false;

    if (
      nextStatus === PaymentStatus.Paid &&
      currentPayment.reservation.status === ReservationStatus.pending
    ) {
      const updatedReservation = await tx.reservation.update({
        where: { id: currentPayment.reservationId },
        data: {
          status: ReservationStatus.confirmed,
          expiresAt: null,
        },
      });
      reservationStatus = updatedReservation.status;
      reservationStatusChanged = true;
    }

    if (
      nextStatus === PaymentStatus.Failed &&
      isTerminalFailure &&
      currentPayment.reservation.status === ReservationStatus.pending
    ) {
      const otherPaidPayment = await tx.payment.findFirst({
        where: {
          reservationId: currentPayment.reservationId,
          id: { not: currentPayment.id },
          status: DbPaymentStatus.paid,
        },
        select: { id: true },
      });

      if (!otherPaidPayment) {
        const updatedReservation = await tx.reservation.update({
          where: { id: currentPayment.reservationId },
          data: { status: ReservationStatus.cancelled },
        });
        reservationStatus = updatedReservation.status;
        reservationStatusChanged = true;
      }
    }

    return {
      paymentId: updatedPayment.id,
      orderId: currentPayment.midtransOrderId!,
      previousStatus: mapDbStatusToFeature(currentPayment.status),
      paymentStatus: mapDbStatusToFeature(updatedPayment.status),
      midtransStatus: transactionStatus,
      reservationId: currentPayment.reservationId,
      reservationStatus,
      reservationStatusChanged,
    };
  });

  if (
    result.paymentStatus === PaymentStatus.Paid &&
    result.reservationStatus === ReservationStatus.confirmed &&
    result.reservationStatusChanged
  ) {
    const { notifyStaffPaymentConfirmed } = await import(
      "@/infrastructure/payment/payment-confirmed.notify"
    );
    const { notifyGuestPaymentSuccess } = await import(
      "@/infrastructure/notifications/guest-notification.service"
    );
    const detail = `Pembayaran ${payment.type} Rp ${Number(
      payment.amount
    ).toLocaleString("id-ID")}`;

    await Promise.allSettled([
      notifyStaffPaymentConfirmed({
        reservationId: payment.reservationId,
        detail,
      }),
      notifyGuestPaymentSuccess(payment.reservationId),
    ]);
  }

  return result;
}

export async function syncMutablePaymentStatuses(): Promise<BulkPaymentSyncResult> {
  const payments = await prisma.payment.findMany({
    where: {
      midtransOrderId: { not: null },
      status: {
        in: [DbPaymentStatus.pending, DbPaymentStatus.failed],
      },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const concurrency = 3;
  let cursor = 0;
  let synced = 0;
  let notStarted = 0;
  let failed = 0;

  async function worker() {
    while (cursor < payments.length) {
      const payment = payments[cursor];
      cursor += 1;

      try {
        await syncPaymentStatus(payment.id);
        synced += 1;
      } catch (error) {
        if (error instanceof MidtransTransactionNotStartedError) {
          notStarted += 1;
          console.info("[payment-sync] transaction not started", {
            paymentId: payment.id,
          });
          continue;
        }

        failed += 1;
        console.error("[payment-sync] failed", {
          paymentId: payment.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, payments.length) }, () =>
      worker()
    )
  );

  return {
    total: payments.length,
    synced,
    notStarted,
    failed,
  };
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
