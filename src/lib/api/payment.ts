export type CreatePaymentRequest = {
  reservationId: string;
  paymentType: "deposit" | "full";
  amount: number;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items?: {
    id?: string;
    name: string;
    price: number;
    quantity: number;
  }[];
};

export type CreatePaymentResponse = {
  orderId: string;
  token: string;
  redirectUrl: string;
};

export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
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
  type: "deposit" | "full";
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