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
  await syncDailyOutdoorState();
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
  await syncDailyOutdoorState();
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

  return allTables
    .map((t) => ({
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
    }))
    .sort((a, b) =>
      a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: "base" })
    );
};

export const getAvailableTables = async (
  sessionId: string,
  date: Date | string,
  capacity: number
) => {
  await syncDailyOutdoorState();
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
 * Validasi ketersediaan beberapa meja sekaligus.
 * Digunakan oleh Public Reservation (tanpa excludeReservationId)
 * dan Admin Table Assignment (dengan excludeReservationId untuk menghindari bentrok dengan diri sendiri).
 *
 * @param tableIds             - Daftar UUID meja yang dipilih.
 * @param sessionId            - Sesi reservasi.
 * @param date                 - Tanggal reservasi.
 * @param excludeReservationId - (Opsional) ID reservasi yang sedang diedit; meja miliknya tidak dianggap konflik.
 */
export const checkMultipleTablesAvailability = async (
  tableIds: string[],
  sessionId: string,
  date: Date | string,
  excludeReservationId?: string,
): Promise<void> => {
  if (tableIds.length === 0) {
    throw new Error("Minimal satu meja harus dipilih.");
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

  // 2. Cek apakah ada meja yang sudah di-lock oleh reservasi aktif lain
  const conflicting = await prisma.reservationTable.findFirst({
    where: {
      tableId: { in: tableIds },
      reservation: {
        // Jika ada excludeReservationId, kecualikan reservasi tersebut dari pengecekan bentrok
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
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
      `Meja ${conflicting.table.tableNumber} sudah dipesan atau sedang dalam proses pembayaran. Silakan pilih meja lain.`,
    );
  }
};

/**
 * ----------------------------------------------------
 * OUTDOOR SEATING & WEATHER TOGGLE (Rainy Mode)
 * ----------------------------------------------------
 */
export type OutdoorAreaStatus = {
  isOpen: boolean;
  totalTables: number;
  activeTables: number;
  totalCapacity: number;
  activeCapacity: number;
  activeTodayBookingsCount: number;
  affectedTableNumbers: string[];
  tables: Array<{
    id: string;
    tableNumber: string;
    capacity: number;
    isActive: boolean;
  }>;
};

const DEFAULT_OUTDOOR_TABLE_DATA = [
  { tableNumber: "OUT-1", capacity: 4, posX: 10, posY: 10 },
  { tableNumber: "OUT-2", capacity: 4, posX: 20, posY: 10 },
  { tableNumber: "OUT-3", capacity: 4, posX: 30, posY: 10 },
  { tableNumber: "OUT-4", capacity: 4, posX: 40, posY: 10 },
];

/** YYYY-MM-DD string according to Asia/Jakarta (WIB) timezone */
export const getTodayWIBDateString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const OUTDOOR_DAILY_TOKEN_KEY = "OUTDOOR_DAILY_ACTIVE";

export async function getOutdoorActiveDate(): Promise<string | null> {
  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token: OUTDOOR_DAILY_TOKEN_KEY },
    });
    return record ? record.identifier : null;
  } catch {
    return null;
  }
}

export async function setOutdoorActiveDate(dateStr: string | null): Promise<void> {
  try {
    if (dateStr) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.verificationToken.upsert({
        where: { token: OUTDOOR_DAILY_TOKEN_KEY },
        update: { identifier: dateStr, expires: expiresAt },
        create: { identifier: dateStr, token: OUTDOOR_DAILY_TOKEN_KEY, expires: expiresAt },
      });
    } else {
      await prisma.verificationToken.deleteMany({
        where: { token: OUTDOOR_DAILY_TOKEN_KEY },
      });
    }
  } catch (err) {
    console.error("[SET OUTDOOR ACTIVE DATE ERROR]", err);
  }
}

export async function syncDailyOutdoorState(): Promise<boolean> {
  await ensureOutdoorTables();
  const todayWIB = getTodayWIBDateString();
  const activeDate = await getOutdoorActiveDate();

  // If outdoor is not activated for today (e.g. new morning / new date):
  if (activeDate !== todayWIB) {
    const activeOutdoorCount = await prisma.table.count({
      where: { tableNumber: { startsWith: "OUT-" }, isActive: true },
    });

    if (activeOutdoorCount > 0) {
      await prisma.table.updateMany({
        where: { tableNumber: { startsWith: "OUT-" } },
        data: { isActive: false },
      });
    }
    return false;
  }

  return true;
}

export async function ensureOutdoorTables(): Promise<void> {
  const existing = await prisma.table.findMany({
    where: { tableNumber: { startsWith: "OUT-" } },
    select: { tableNumber: true },
  });

  const existingNumbers = new Set(existing.map((t) => t.tableNumber));
  const missing = DEFAULT_OUTDOOR_TABLE_DATA.filter(
    (t) => !existingNumbers.has(t.tableNumber),
  );

  if (missing.length > 0) {
    for (const t of missing) {
      await prisma.table.upsert({
        where: { tableNumber: t.tableNumber },
        update: { capacity: t.capacity },
        create: {
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          posX: t.posX,
          posY: t.posY,
          isActive: false, // Default to OFF on initial creation
          status: TableStatus.AVAILABLE,
        },
      });
    }
  }
}

export async function getOutdoorAreaStatus(): Promise<OutdoorAreaStatus> {
  await syncDailyOutdoorState();

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [outdoorTables, outdoorReservationsToday] = await Promise.all([
    prisma.table.findMany({
      where: { tableNumber: { startsWith: "OUT-" } },
      orderBy: { tableNumber: "asc" },
      select: {
        id: true,
        tableNumber: true,
        capacity: true,
        isActive: true,
      },
    }),
    prisma.reservationTable.findMany({
      where: {
        table: { tableNumber: { startsWith: "OUT-" } },
        reservation: {
          date: todayStart,
          status: { in: [ReservationStatus.confirmed, ReservationStatus.checked_in, ReservationStatus.pending] },
        },
      },
      select: {
        table: { select: { tableNumber: true } },
      },
    }),
  ]);

  const totalTables = outdoorTables.length;
  const activeTables = outdoorTables.filter((t) => t.isActive).length;
  const totalCapacity = outdoorTables.reduce((acc, t) => acc + t.capacity, 0);
  const activeCapacity = outdoorTables
    .filter((t) => t.isActive)
    .reduce((acc, t) => acc + t.capacity, 0);

  const isOpen = activeTables > 0;
  const affectedTableNumbers = Array.from(
    new Set(outdoorReservationsToday.map((r) => r.table.tableNumber)),
  );
  const activeTodayBookingsCount = outdoorReservationsToday.length;

  return {
    isOpen,
    totalTables,
    activeTables,
    totalCapacity,
    activeCapacity,
    activeTodayBookingsCount,
    affectedTableNumbers,
    tables: outdoorTables,
  };
}

export async function toggleOutdoorArea(isOpen: boolean): Promise<OutdoorAreaStatus> {
  await ensureOutdoorTables();
  const todayWIB = getTodayWIBDateString();

  if (isOpen) {
    await setOutdoorActiveDate(todayWIB);
    await prisma.table.updateMany({
      where: { tableNumber: { startsWith: "OUT-" } },
      data: { isActive: true },
    });
  } else {
    await setOutdoorActiveDate(null);
    await prisma.table.updateMany({
      where: { tableNumber: { startsWith: "OUT-" } },
      data: { isActive: false },
    });
  }

  return getOutdoorAreaStatus();
}

