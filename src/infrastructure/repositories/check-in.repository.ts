import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus } from "@/generated/prisma/client";
import {
  CHECK_IN_GRACE_EXPIRED_MESSAGE,
  formatJakartaDateKey,
  isPastCheckInGrace,
  jakartaDateKeyToUtcDate,
} from "@/infrastructure/check-in/grace";

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
    select: {
      id: true,
      status: true,
      date: true,
      session: { select: { startTime: true } },
    },
  });
  if (!reservation) {
    throw new Error("Reservation not found");
  }
  if (!CHECKIN_ELIGIBLE.includes(reservation.status)) {
    throw new Error("Reservation is not eligible for check-in");
  }

  if (
    isPastCheckInGrace({
      reservationDate: reservation.date,
      sessionStartTime: reservation.session.startTime,
    })
  ) {
    throw new Error(CHECK_IN_GRACE_EXPIRED_MESSAGE);
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

/**
 * Tandai no_show otomatis untuk reservasi confirmed
 * yang sudah lewat jam sesi + grace (tanpa refund DP).
 */
export async function runAutoNoShowJob(now: Date = new Date()) {
  const todayKey = formatJakartaDateKey(now);
  const today = jakartaDateKeyToUtcDate(todayKey);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const candidates = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.confirmed,
      date: { gte: yesterday, lte: today },
      checkIn: null,
    },
    select: {
      id: true,
      date: true,
      guest: { select: { name: true } },
      session: { select: { name: true, startTime: true } },
    },
  });

  const results = {
    scanned: candidates.length,
    marked: 0,
    skipped: 0,
    failed: 0,
    reservationIds: [] as string[],
  };

  for (const reservation of candidates) {
    const overdue = isPastCheckInGrace({
      reservationDate: reservation.date,
      sessionStartTime: reservation.session.startTime,
      now,
    });

    if (!overdue) {
      results.skipped += 1;
      continue;
    }

    try {
      await markReservationNoShow(reservation.id);
      results.marked += 1;
      results.reservationIds.push(reservation.id);
    } catch (error) {
      results.failed += 1;
      console.error("[cron/no-show] failed:", reservation.id, error);
    }
  }

  return results;
}
