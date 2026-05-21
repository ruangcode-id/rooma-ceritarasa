import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus, type Reservation } from "@/generated/prisma/client";

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

const CANCELLABLE: ReservationStatus[] = [
  ReservationStatus.pending,
  ReservationStatus.confirmed,
];

export async function cancelReservationByToken(
  cancelToken: string,
): Promise<{ reservationId: string } | null> {
  const found = await prisma.reservation.findUnique({
    where: { cancelToken },
    select: { id: true, status: true },
  });
  if (!found) return null;
  if (!CANCELLABLE.includes(found.status)) {
    throw new Error("Reservation cannot be cancelled in its current status");
  }
  await prisma.reservation.update({
    where: { id: found.id },
    data: { status: ReservationStatus.cancelled },
  });
  return { reservationId: found.id };
}

/** Lookup reservasi: UUID → id; selain itu → cancel_token */
export async function findReservationByLookup(
  lookup: string,
): Promise<(Reservation & { guest: { name: string } }) | null> {
  const trimmed = lookup.trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(trimmed)) {
    return prisma.reservation.findFirst({
      where: { id: trimmed },
      include: { guest: { select: { name: true } } },
    });
  }

  return prisma.reservation.findFirst({
    where: { cancelToken: trimmed },
    include: { guest: { select: { name: true } } },
  });
}

export async function findReservationByIdForAdmin(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, name: true, phone: true } },
      session: { select: { id: true, name: true } },
      checkIn: true,
      reservationTables: {
        include: { table: { select: { id: true, tableNumber: true } } },
      },
    },
  });
}
