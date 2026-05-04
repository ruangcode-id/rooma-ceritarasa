import { prisma } from "@/infrastructure/database/prisma";
import { TableStatus } from "@/generated/prisma/client";

const startOfUTCDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const parseDateOnlyUTC = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  if (date.toISOString().slice(0, 10) !== dateStr) {
    throw new Error("Invalid date");
  }
  return date;
};

// For capacity, only count reservations that actually consume seats.
const CAPACITY_STATUSES = ["confirmed", "checked_in"] as const;
type CapacityStatus = (typeof CAPACITY_STATUSES)[number];

// For table assignment, also block tables already held by an in-progress reservation.
const TABLE_BLOCK_STATUSES = ["pending", "confirmed", "checked_in"] as const;
type TableBlockStatus = (typeof TABLE_BLOCK_STATUSES)[number];

export const getSessionAvailability = async (sessionId: string, date: Date | string) => {
  const dateObj = typeof date === "string" ? parseDateOnlyUTC(date) : date;
  const normalizedDate = startOfUTCDate(dateObj);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, maxCapacity: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const agg = await prisma.reservation.aggregate({
    where: {
      sessionId,
      date: normalizedDate,
      status: { in: CAPACITY_STATUSES as unknown as CapacityStatus[] },
    },
    _sum: { partySize: true },
  });

  const used = agg._sum.partySize ?? 0;
  const remaining = Math.max(0, session.maxCapacity - used);

  return {
    sessionId,
    date: normalizedDate,
    maxCapacity: session.maxCapacity,
    usedCapacity: used,
    remainingCapacity: remaining,
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

  const dateObj = typeof date === "string" ? parseDateOnlyUTC(date) : date;
  const normalizedDate = startOfUTCDate(dateObj);

  const tables = await prisma.table.findMany({
    where: {
      isActive: true,
      capacity: { gte: capacity },
      status: {
        notIn: [TableStatus.MAINTENANCE, TableStatus.OCCUPIED, TableStatus.RESERVED],
      },
      reservationTables: {
        none: {
          reservation: {
            sessionId,
            date: normalizedDate,
            status: { in: TABLE_BLOCK_STATUSES as unknown as TableBlockStatus[] },
          },
        },
      },
    },
    orderBy: [{ capacity: "asc" }, { tableNumber: "asc" }],
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

  const candidates = await getAvailableTables(sessionId, date, guestCount);

  if (candidates.length === 0) {
    throw new Error("No available table for the requested guest count");
  }

  // candidates already sorted by smallest capacity then tableNumber
  return candidates[0];
};
