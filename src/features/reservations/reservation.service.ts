import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus } from "@/generated/prisma/client";

export type CreateReservationInput = {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  sessionId: string;
  date: string;
  partySize: number;
  specialRequest?: string;
};

export type CreateReservationResult = {
  reservationId: string;
  guestId: string;
  status: string;
};

export async function createPublicReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  const result = await prisma.$transaction(async (tx) => {
    let guest = await tx.guest.findFirst({
      where: {
        phone: input.guestPhone,
        deletedAt: null,
      },
    });

    if (!guest) {
      guest = await tx.guest.create({
        data: {
          name: input.guestName,
          phone: input.guestPhone,
          email: input.guestEmail ?? null,
          isVip: false,
          tags: [],
        },
      });
    }

    const reservation = await tx.reservation.create({
      data: {
        guestId: guest.id,
        sessionId: input.sessionId,
        date: new Date(input.date),
        partySize: input.partySize,
        status: ReservationStatus.pending,
        specialRequest: input.specialRequest ?? null,
      },
    });

    return {
      reservationId: reservation.id,
      guestId: guest.id,
      status: reservation.status,
    };
  });

  return result;
}