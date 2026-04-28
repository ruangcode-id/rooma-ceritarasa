import type { ReservationStatus } from "@/generated/prisma/client";

export interface ReservationEntity {
  id: string;
  guestId: string;
  sessionId: string;
  date: Date;
  partySize: number;
  status: ReservationStatus;
  specialRequest: string | null;
  internalNotes: string | null;
  cancelToken: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
