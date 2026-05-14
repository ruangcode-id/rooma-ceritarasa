import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus } from "@/generated/prisma/client";

export type GuestInput = {
  name: string;
  phone: string;
  email?: string;
};

export type ReservationInput = {
  sessionId: string;
  date: Date;
  partySize: number;
  specialRequest?: string;
  status: ReservationStatus;
  cancelToken: string;
  /** Batas waktu pembayaran — set ke now + 15 menit saat create. */
  expiresAt: Date;
};

export async function createReservationTransaction(
  guestInput: GuestInput,
  reservationInput: ReservationInput,
  tableIds: string[],
) {
  if (tableIds.length === 0) {
    throw new Error("At least one table is required");
  }

  return prisma.$transaction(async (tx) => {
    let guest = await tx.guest.findFirst({
      where: { phone: guestInput.phone, deletedAt: null },
    });

    if (!guest) {
      guest = await tx.guest.create({
        data: {
          name: guestInput.name,
          phone: guestInput.phone,
          email: guestInput.email,
          isVip: false,
        },
      });
    }

    const reservation = await tx.reservation.create({
      data: {
        guestId: guest.id,
        sessionId: reservationInput.sessionId,
        date: reservationInput.date,
        partySize: reservationInput.partySize,
        specialRequest: reservationInput.specialRequest,
        status: reservationInput.status,
        cancelToken: reservationInput.cancelToken,
        expiresAt: reservationInput.expiresAt,
      },
    });

    await tx.reservationTable.createMany({
      data: tableIds.map((tableId) => ({
        reservationId: reservation.id,
        tableId,
      })),
    });

    return reservation;
  });
}
