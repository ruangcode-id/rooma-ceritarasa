import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus, TableStatus } from "@/generated/prisma/client";

const startOfUTCDate = (date: Date) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

const parseDateOnlyUTC = (date: Date | string) => {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return startOfUTCDate(date);
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date");
  }

  if (parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }

  return parsedDate;
};

const CAPACITY_STATUSES = [
  ReservationStatus.confirmed,
  ReservationStatus.checked_in,
];

const TABLE_BLOCK_STATUSES = [
  ReservationStatus.pending,
  ReservationStatus.confirmed,
  ReservationStatus.checked_in,
];

export const getSessionAvailability = async (
  sessionId: string,
  date: Date | string
) => {
  const normalizedDate = parseDateOnlyUTC(date);

  const session = await prisma.restaurantSession.findUnique({
    where: {
      id: sessionId,
    },
    select: {
      id: true,
      name: true,
      maxCapacity: true,
      isActive: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (!session.isActive) {
    throw new Error("Session is not active");
  }

  const reservationAggregate = await prisma.reservation.aggregate({
    where: {
      sessionId,
      date: normalizedDate,
      status: {
        in: CAPACITY_STATUSES,
      },
    },
    _sum: {
      partySize: true,
    },
  });

  const usedCapacity = reservationAggregate._sum.partySize ?? 0;
  const remainingCapacity = Math.max(0, session.maxCapacity - usedCapacity);

  return {
    sessionId: session.id,
    sessionName: session.name,
    date: normalizedDate.toISOString().slice(0, 10),
    maxCapacity: session.maxCapacity,
    usedCapacity,
    remainingCapacity,
  };
};

export const validateCapacity = async (
  sessionId: string,
  date: Date | string,
  guestCount: number
) => {
  if (!Number.isInteger(guestCount) || guestCount <= 0) {
    throw new Error("guestCount must be a positive integer");
  }

  const availability = await getSessionAvailability(sessionId, date);

  if (availability.remainingCapacity < guestCount) {
    throw new Error(
      `Not enough capacity. Remaining: ${availability.remainingCapacity}, requested: ${guestCount}`
    );
  }

  return availability;
};

export const getAvailableTables = async (
  sessionId: string,
  date: Date | string,
  capacity: number
) => {
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("capacity must be a positive integer");
  }

  const normalizedDate = parseDateOnlyUTC(date);

  const tables = await prisma.table.findMany({
    where: {
      isActive: true,
      capacity: {
        gte: capacity,
      },
      status: {
        notIn: [
          TableStatus.MAINTENANCE,
          TableStatus.OCCUPIED,
          TableStatus.RESERVED,
        ],
      },
      reservationTables: {
        none: {
          reservation: {
            sessionId,
            date: normalizedDate,
            status: {
              in: TABLE_BLOCK_STATUSES,
            },
          },
        },
      },
    },
    orderBy: [
      {
        capacity: "asc",
      },
      {
        tableNumber: "asc",
      },
    ],
    select: {
      id: true,
      tableNumber: true,
      capacity: true,
      posX: true,
      posY: true,
      status: true,
      isActive: true,
    },
  });

  return tables;
};

export const autoAssignTable = async (
  sessionId: string,
  date: Date | string,
  guestCount: number
) => {
  await validateCapacity(sessionId, date, guestCount);

  const availableTables = await getAvailableTables(
    sessionId,
    date,
    guestCount
  );

  if (availableTables.length === 0) {
    throw new Error("No available table for the requested guest count");
  }

  return availableTables[0];
};