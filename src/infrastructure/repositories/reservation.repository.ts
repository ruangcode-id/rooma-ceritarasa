import { prisma } from "@/infrastructure/database/prisma";
import { ReservationStatus, Prisma } from "@/generated/prisma/client";

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

export type AdminReservationFilters = {
  date?: Date;
  status?: ReservationStatus;
  sessionId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export async function getAdminReservations(filters: AdminReservationFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const where: Prisma.ReservationWhereInput = {};

  if (filters.date) where.date = filters.date;
  if (filters.status) where.status = filters.status;
  if (filters.sessionId) where.sessionId = filters.sessionId;

  if (filters.search) {
    where.guest = {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ],
    };
  }

  const [total, data] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        guest: { select: { id: true, name: true, phone: true } },
        session: { select: { id: true, name: true, startTime: true, endTime: true } },
        reservationTables: {
          include: {
            table: { select: { id: true, tableNumber: true, capacity: true } }
          }
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  return prisma.reservation.update({
    where: { id },
    data: { status },
    include: { guest: { select: { id: true } } }
  });
}

/**
 * Ambil satu reservasi beserta relasi tabel-nya (untuk kebutuhan validasi di Admin use case).
 */
export async function getReservationById(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      reservationTables: { select: { tableId: true } },
    },
  });
}

/**
 * Ganti semua meja yang terhubung ke reservasi secara atomik di dalam satu transaksi.
 * Langkah: hapus relasi lama → buat relasi baru.
 * Dipanggil setelah validasi kapasitas dan ketersediaan meja berhasil dilakukan di Use Case.
 */
export async function updateReservationTablesTransaction(
  reservationId: string,
  tableIds: string[],
) {
  if (tableIds.length === 0) {
    throw new Error("At least one table is required");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Hapus semua relasi meja lama
    await tx.reservationTable.deleteMany({ where: { reservationId } });

    // 2. Buat relasi meja baru
    await tx.reservationTable.createMany({
      data: tableIds.map((tableId) => ({ reservationId, tableId })),
    });

    return tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        reservationTables: {
          include: { table: { select: { id: true, tableNumber: true, capacity: true } } },
        },
      },
    });
  });
}

