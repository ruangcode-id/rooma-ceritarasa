import type { EventRequestStatus, EventOfferStatus, EventPaymentStatus, EventPaymentType } from "@/generated/prisma/client";

export interface EventRequestEntity {
  id: string;
  guestId: string;
  sessionId: string | null;
  eventType: string | null;
  eventDate: Date;
  partySize: number | null;
  description: string | null;
  status: EventRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventOfferEntity {
  id: string;
  eventRequestId: string;
  createdBy: string | null;
  price: number | null;
  description: string | null;
  documentUrl: string | null;
  status: EventOfferStatus;
  createdAt: Date;
}

export interface EventPaymentEntity {
  id: string;
  eventRequestId: string;
  type: EventPaymentType | null;
  amount: number | null;
  status: EventPaymentStatus | null;
  paymentMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  eventDate: Date | null;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
