import { ReservationPaymentType } from "@/features/payments/payment.types";

export type CreatePaymentRequest = {
  reservationId: string;
  paymentType: ReservationPaymentType;
};

export type DepositPolicy = {
  noDepositMaxGuests: number;
  depositForWeekendTwoGuests: number;
  depositForThreeToFourGuests: number;
  depositForFivePlusGuests: number;
  minimumOrderForTenPlusGuests: number;
};

export type CreatePaymentResponse = {
  paymentRequired: boolean;
  reservationId: string;
  partySize: number;
  amount: number;
  minimumOrder: number | null;
  depositPolicy: DepositPolicy;
  message?: string;
  orderId?: string;
  token?: string;
  redirectUrl?: string;
};

export async function createPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  const response = await fetch("/api/public/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to create payment");
  }

  return data.data;
}

export type PaymentStatusResponse = {
  orderId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  type: ReservationPaymentType;
  amount?: number;
};

export async function getPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
  const response = await fetch(`/api/public/payments/${orderId}/status`);

  if (!response.ok) {
    throw new Error("Failed to fetch payment status");
  }

  const data = await response.json();
  return data.data;
}