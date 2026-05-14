import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, TableStatus } from "@/generated/prisma/client";

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

/** Meja starter jika DB belum punya satupun baris di `tables` (dev / setup awal). */
const DEFAULT_TABLE_SEED: Array<{ tableNumber: string; capacity: number }> = [
  { tableNumber: "T01", capacity: 4 },
  { tableNumber: "T02", capacity: 4 },
  { tableNumber: "T03", capacity: 4 },
  { tableNumber: "T04", capacity: 4 },
  { tableNumber: "T05", capacity: 4 },
  { tableNumber: "T06", capacity: 4 },
  { tableNumber: "T07", capacity: 6 },
  { tableNumber: "T08", capacity: 6 },
  { tableNumber: "T09", capacity: 8 },
  { tableNumber: "T10", capacity: 8 },
];

/**
 * Jika belum ada meja sama sekali di database, buat set default.
 * Matikan dengan env `DISABLE_AUTO_TABLE_SEED=1` (mis. produksi ketat).
 */
async function ensureDefaultTablesIfCatalogEmpty(): Promise<void> {
  if (process.env.DISABLE_AUTO_TABLE_SEED === "1") {
    return;
  }

  const total = await prisma.table.count();
  if (total > 0) {
    return;
  }

  await prisma.table.createMany({
    data: DEFAULT_TABLE_SEED.map((row) => ({
      tableNumber: row.tableNumber,
      capacity: row.capacity,
      isActive: true,
      status: TableStatus.AVAILABLE,
    })),
    skipDuplicates: true,
  });
}

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
          { status: { in: ["confirmed", "checked_in"] as CapacityStatus[] } },
          { status: "pending", expiresAt: { gt: new Date() } },
        ],
      },
    },
  },
});

export type BookableTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  posX: number | null;
  posY: number | null;
  status: TableStatus;
  isActive: boolean;
};

/**
 * Validasi bahwa meja spesifik yang dipilih guest tersedia untuk sesi + tanggal tertentu.
 * Melempar Error jika meja tidak aktif, tidak ditemukan, atau sedang dipesan/dalam window pembayaran.
 */
export const checkTableAvailability = async (
  tableId: string,
  sessionId: string,
  date: Date | string,
): Promise<void> => {
  const dateObj = typeof date === "string" ? parseDateOnlyUTC(date) : date;
  const normalizedDate = startOfUTCDate(dateObj);
  const now = new Date();

  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      isActive: true,
      status: {
        notIn: [TableStatus.MAINTENANCE, TableStatus.OCCUPIED, TableStatus.RESERVED],
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
          { status: { in: ["confirmed", "checked_in"] as CapacityStatus[] } },
          { status: "pending", expiresAt: { gt: now } },
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
  const dateObj = typeof date === "string" ? parseDateOnlyUTC(date) : date;
  const normalizedDate = startOfUTCDate(dateObj);
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
              { status: { in: ["confirmed", "checked_in"] as CapacityStatus[] } },
              { status: "pending", expiresAt: { gt: now } },
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

/** Meja aktif yang belum terikat reservasi blocking untuk sesi + tanggal (tanpa filter kapasitas). */
export const getUnblockedTables = async (
  sessionId: string,
  date: Date | string,
  orderBy: "asc" | "desc" = "desc",
): Promise<BookableTable[]> => {
  const dateObj = typeof date === "string" ? parseDateOnlyUTC(date) : date;
  const normalizedDate = startOfUTCDate(dateObj);

  return prisma.table.findMany({
    where: unblockedTableWhere(sessionId, normalizedDate),
    orderBy: [{ capacity: orderBy }, { tableNumber: "asc" }],
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
      ...unblockedTableWhere(sessionId, normalizedDate),
      capacity: { gte: capacity },
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

/**
 * Pilih satu atau lebih meja agar total kapasitas meja ≥ jumlah tamu.
 * - Satu meja: meja aktif terkecil yang masih muat (hemat seat).
 * - Gabungan: greedy kapasitas terbesar dulu agar jumlah meja minimal.
 */
export const autoAssignTables = async (
  sessionId: string,
  date: Date | string,
  guestCount: number
): Promise<BookableTable[]> => {
  await validateCapacity(sessionId, date, guestCount);

  let poolDesc = await getUnblockedTables(sessionId, date, "desc");

  if (poolDesc.length === 0) {
    await ensureDefaultTablesIfCatalogEmpty();
    poolDesc = await getUnblockedTables(sessionId, date, "desc");
  }

  const singleFit = poolDesc
    .filter((t) => t.capacity >= guestCount)
    .sort(
      (a, b) =>
        a.capacity - b.capacity ||
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
    );
  if (singleFit.length > 0) {
    return [singleFit[0]];
  }

  let remaining = guestCount;
  const picked: BookableTable[] = [];
  for (const t of poolDesc) {
    if (remaining <= 0) break;
    picked.push(t);
    remaining -= t.capacity;
  }

  if (remaining > 0 || picked.length === 0) {
    const totalBookable = poolDesc.reduce((sum, t) => sum + t.capacity, 0);
    if (poolDesc.length === 0) {
      throw new Error(
        "No available table for the requested guest count: no free table for this session and date (catalog empty, all tables busy, inactive, or status is MAINTENANCE/OCCUPIED/RESERVED)."
      );
    }
    throw new Error(
      `No available table for the requested guest count: need seats for ${guestCount}, but only ${totalBookable} seat(s) can be assigned from free tables for this slot.`
    );
  }

  return picked;
};

/** @deprecated Prefer autoAssignTables — tetap diekspor untuk pemanggil yang hanya butuh satu baris meja. */
export const autoAssignTable = async (
  sessionId: string,
  date: Date | string,
  guestCount: number
) => {
  const tables = await autoAssignTables(sessionId, date, guestCount);
  return tables[0];
};
