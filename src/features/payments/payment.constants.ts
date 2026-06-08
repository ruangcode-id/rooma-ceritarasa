import { PaymentStatus } from "./payment.types";

export const DEFAULT_PAYMENT_CURRENCY = "IDR";

export const MIDTRANS_FRAUD_CHALLENGE_STATUS = "challenge";

export const MIDTRANS_STATUS_MAP: Record<string, PaymentStatus> = {
  settlement: PaymentStatus.Paid,
  capture: PaymentStatus.Paid,
  pending: PaymentStatus.Pending,
  deny: PaymentStatus.Failed,
  cancel: PaymentStatus.Failed,
  expire: PaymentStatus.Failed,
  refund: PaymentStatus.Refunded,
  partial_refund: PaymentStatus.Refunded,
};
