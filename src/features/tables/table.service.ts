import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, ReservationStatus, TableStatus } from "@/generated/prisma/client";

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

export type BookableTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  posX: number | null;
  posY: number | null;
  status: TableStatus;
  isActive: boolean;
};

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

/**
 * Meja dianggap "terblokir" oleh reservasi jika:
 * - Statusnya `confirmed` atau `checked_in` (sudah pasti dipakai), ATAU
 * - Statusnya `pending` DAN `expiresAt` belum lewat (dalam window 15 menit).
 * Reservasi `pending` yang sudah expired TIDAK lagi memblokir meja.
 */
const unblockedTableWhere = (
  sessionId: string,
  normalizedDate: Date,
): Prisma.TableWhereInput => ({
  isActive: true,
  status: {
    notIn: [TableStatus.MAINTENANCE, TableStatus.OCCUPIED, TableStatus.RESERVED],
  },
  reservationTables: {
    none: {
      reservation: {
        sessionId,
        date: normalizedDate,
        OR: [
          { status: { in: CAPACITY_STATUSES } },
          { status: ReservationStatus.pending, expiresAt: { gt: new Date() } },
        ],
      },
    },
  },
});

/**
 * Validasi bahwa meja spesifik yang dipilih guest tersedia untuk sesi + tanggal tertentu.
 * Melempar Error jika meja tidak aktif, tidak ditemukan, atau sedang dipesan/dalam window pembayaran.
 */
export const checkTableAvailability = async (
  tableId: string,
  sessionId: string,
  date: Date | string,
): Promise<void> => {
  const normalizedDate = parseDateOnlyUTC(date);
  const now = new Date();

  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      isActive: true,
      status: {
        notIn: [
          TableStatus.MAINTENANCE,
          TableStatus.OCCUPIED,
          TableStatus.RESERVED,
        ],
      },
    },
  });

  if (!table) {
    throw new Error("Meja tidak ditemukan atau tidak tersedia untuk reservasi.");
  }

  const blocking = await prisma.reservationTable.findFirst({
    where: {
      tableId,
      reservation: {
        sessionId,
        date: normalizedDate,
        OR: [
          { status: { in: CAPACITY_STATUSES } },
          { status: ReservationStatus.pending, expiresAt: { gt: now } },
        ],
      },
    },
  });

  if (blocking) {
    throw new Error(
      "Meja yang dipilih sudah dipesan atau sedang dalam proses pembayaran. Silakan pilih meja lain."
    );
  }
};

/**
 * Kembalikan semua meja aktif beserta flag `isAvailable` untuk sesi + tanggal tertentu.
 * Digunakan oleh public endpoint agar guest bisa melihat denah dan memilih meja yang kosong.
 */
export const getPublicTableAvailability = async (
  sessionId: string,
  date: Date | string,
): Promise<Array<BookableTable & { isAvailable: boolean }>> => {
  const normalizedDate = parseDateOnlyUTC(date);
  const now = new Date();

  const allTables = await prisma.table.findMany({
    where: { isActive: true },
    orderBy: [{ tableNumber: "asc" }],
    select: {
      id: true,
      tableNumber: true,
      capacity: true,
      posX: true,
      posY: true,
      status: true,
      isActive: true,
      reservationTables: {
        where: {
          reservation: {
            sessionId,
            date: normalizedDate,
            OR: [
              { status: { in: CAPACITY_STATUSES } },
              { status: ReservationStatus.pending, expiresAt: { gt: now } },
            ],
          },
        },
        take: 1,
      },
    },
  });

  return allTables.map((t) => ({
    id: t.id,
    tableNumber: t.tableNumber,
    capacity: t.capacity,
    posX: t.posX,
    posY: t.posY,
    status: t.status,
    isActive: t.isActive,
    isAvailable:
      t.status !== TableStatus.MAINTENANCE &&
      t.status !== TableStatus.OCCUPIED &&
      t.status !== TableStatus.RESERVED &&
      t.reservationTables.length === 0,
  }));
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
      ...unblockedTableWhere(sessionId, normalizedDate),
      capacity: {
        gte: capacity,
      },
    },
    orderBy: [
      { capacity: "asc" },
      { tableNumber: "asc" },
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

export const autoAssignTables = async (
  sessionId: string,
  date: Date | string,
  guestCount: number
): Promise<BookableTable[]> => {
  await validateCapacity(sessionId, date, guestCount);

  const availableTables = await getAvailableTables(
    sessionId,
    date,
    guestCount
  );

  if (availableTables.length === 0) {
    throw new Error("No available table for the requested guest count");
  }

  return [availableTables[0]];
};

/** @deprecated */
export const autoAssignTable = async (
  sessionId: string,
  date: Date | string,
  guestCount: number
) => {
  const tables = await autoAssignTables(sessionId, date, guestCount);
  return tables[0];
};

/**
 * Validasi ketersediaan beberapa meja sekaligus untuk Admin.
 *
 * @param tableIds           - Daftar meja yang ingin di-assign.
 * @param sessionId          - Sesi reservasi.
 * @param date               - Tanggal reservasi.
 * @param excludeReservationId - ID reservasi yang sedang di-edit (meja miliknya sendiri tidak dianggap bentrok).
 *
 * Melempar Error jika ada meja yang tidak aktif, tidak ditemukan,
 * atau sedang di-lock oleh reservasi LAIN pada sesi + tanggal yang sama.
 */
export const checkMultipleTablesAvailability = async (
  tableIds: string[],
  sessionId: string,
  date: Date | string,
  excludeReservationId: string,
): Promise<void> => {
  if (tableIds.length === 0) {
    throw new Error("At least one table must be specified");
  }

  const normalizedDate = parseDateOnlyUTC(date);
  const now = new Date();

  // 1. Pastikan semua meja ada, aktif, dan tidak dalam status Maintenance/Occupied/Reserved
  const activeTables = await prisma.table.findMany({
    where: {
      id: { in: tableIds },
      isActive: true,
      status: {
        notIn: [
          TableStatus.MAINTENANCE,
          TableStatus.OCCUPIED,
          TableStatus.RESERVED,
        ],
      },
    },
    select: { id: true, tableNumber: true },
  });

  if (activeTables.length !== tableIds.length) {
    const foundIds = activeTables.map((t) => t.id);
    const invalidIds = tableIds.filter((id) => !foundIds.includes(id));
    throw new Error(
      `Beberapa meja tidak ditemukan atau tidak tersedia: ${invalidIds.join(", ")}`,
    );
  }

  // 2. Cek apakah ada meja yang di-lock oleh reservasi LAIN (bukan diri sendiri)
  const conflicting = await prisma.reservationTable.findFirst({
    where: {
      tableId: { in: tableIds },
      reservation: {
        id: { not: excludeReservationId }, // Kecualikan reservasi yang sedang di-edit
        sessionId,
        date: normalizedDate,
        OR: [
          { status: { in: [ReservationStatus.confirmed, ReservationStatus.checked_in] } },
          { status: ReservationStatus.pending, expiresAt: { gt: now } },
        ],
      },
    },
    include: {
      table: { select: { tableNumber: true } },
    },
  });

  if (conflicting) {
    throw new Error(
      `Meja ${conflicting.table.tableNumber} sudah dipesan oleh tamu lain pada sesi dan tanggal ini.`,
    );
  }
};

