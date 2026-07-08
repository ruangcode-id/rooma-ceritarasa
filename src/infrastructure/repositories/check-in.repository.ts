import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus } from "@/generated/prisma/client";

const CHECKIN_ELIGIBLE: ReservationStatus[] = [
  ReservationStatus.pending,
  ReservationStatus.confirmed,
];

export async function markReservationCheckedIn(
  reservationId: string,
  checkedInByUserId: string,
): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true },
  });
  if (!reservation) {
    throw new Error("Reservation not found");
  }
  if (!CHECKIN_ELIGIBLE.includes(reservation.status)) {
    throw new Error("Reservation is not eligible for check-in");
  }

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.checked_in },
    }),
    prisma.checkIn.create({
      data: {
        reservationId,
        checkedInBy: checkedInByUserId,
      },
    }),
  ]);
}

export async function markReservationNoShow(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true },
  });
  if (!reservation) {
    throw new Error("Reservation not found");
  }
  if (!CHECKIN_ELIGIBLE.includes(reservation.status)) {
    throw new Error("Reservation cannot be marked no-show in its current status");
  }
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: ReservationStatus.no_show },
  });
}
