import { ReservationStatus } from "@/generated/prisma/client";

export interface CreateReservationResult {
  reservationId: string;
  /** ISO-8601 timestamp: batas waktu pembayaran (now + 15 menit). Digunakan Dev B untuk set expiry Midtrans & FE untuk countdown timer. */
  expiresAt: string;
}

export interface ReservationEventPayload {
  reservationId: string;
  status: ReservationStatus;
  guestId: string;
}
