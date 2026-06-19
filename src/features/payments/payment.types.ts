export enum PaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
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
  type: ReservationPaymentType;
  amount?: number;
  raw?: Record<string, unknown>;
};

export type PaymentSyncResult = {
  paymentId: string;
  orderId: string;
  previousStatus: PaymentStatus;
  paymentStatus: PaymentStatus;
  midtransStatus: string;
  reservationId: string;
  reservationStatus: string;
  reservationStatusChanged: boolean;
};

export type PaymentSummary = {
  paidRevenue: number;
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
};

export type BulkPaymentSyncResult = {
  total: number;
  synced: number;
  failed: number;
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
