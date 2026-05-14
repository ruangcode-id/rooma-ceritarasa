export enum PaymentStatus {
  Pending = "pending",
  Success = "success",
  Failed = "failed",
  Expired = "expired",
  Canceled = "canceled",
  Refunded = "refunded",
}

export enum PaymentType {
  CreditCard = "credit_card",
  BankTransfer = "bank_transfer",
  Ewallet = "ewallet",
  Qris = "qris",
  Cash = "cash",
  Unknown = "unknown",
}

export enum ReservationPaymentType {
  Deposit = "deposit",
  Full = "full",
}

export type PaymentCustomer = {
  name?: string;
  email?: string;
  phone?: string;
};

export type PaymentItem = {
  id?: string;
  name: string;
  price: number;
  quantity: number;
};

export type CreatePaymentInput = {
  reservationId: string;
  paymentType: ReservationPaymentType;
  orderId?: string;
  amount: number;
  customer?: PaymentCustomer;
  items?: PaymentItem[];
  metadata?: Record<string, unknown>;
};

export type CreatePaymentResult = {
  orderId: string;
  token: string;
  redirectUrl: string;
};

export type PaymentListQuery = {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  orderId?: string;
};

export type PaymentRecord = {
  orderId: string;
  status: PaymentStatus;
  type: PaymentType;
  amount?: number;
  raw?: Record<string, unknown>;
};

export type MidtransWebhookPayload = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
};
