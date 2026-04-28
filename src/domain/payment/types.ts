import type { PaymentType, PaymentStatus } from "@/generated/prisma/client";

export interface PaymentEntity {
  id: string;
  reservationId: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  midtransOrderId: string | null;
  midtransTxnId: string | null;
  paymentMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
}
