import crypto from "crypto";
import { ReservationStatus } from "@/generated/prisma/client";
import {
  PublicReservationInput,
  type CancelReservationInput,
} from "@/validations/reservation.validation";
import { BlockedDateRepository } from "@/infrastructure/repositories/blocked-date.repository";
import { checkMultipleTablesAvailability } from "@/features/tables/table.service";
import {
  cancelReservationByToken,
  createReservationTransaction,
  getAdminReservations,
  updateReservationStatus,
  getReservationById,
  updateReservationTablesTransaction,
  AdminReservationFilters,
} from "@/infrastructure/repositories/reservation.repository";
import { appEvents, EVENTS } from "@/lib/events";
import { prisma } from "@/infrastructure/database/prisma";
import { createPublicReservation } from "@/features/reservations/reservation.service";

/** Durasi jendela pembayaran dalam milidetik (15 menit). */
const PAYMENT_EXPIRY_MS = 15 * 60 * 1000;

const parseDateOnlyUTC = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
};

export const PublicReservationUseCase = {
  createReservationAction: async (input: PublicReservationInput) => {
    const dateObj = parseDateOnlyUTC(input.date);
    const isBlocked = await BlockedDateRepository.isDateBlocked(dateObj);
    if (isBlocked) {
      throw new Error(`Tanggal ${input.date} tidak tersedia untuk reservasi.`);
    }

    await checkMultipleTablesAvailability(input.tableIds, input.sessionId, input.date);

    const selectedTables = await prisma.table.findMany({
      where: { id: { in: input.tableIds } },
      select: { capacity: true, tableNumber: true },
    });
    const totalCapacity = selectedTables.reduce((sum, t) => sum + t.capacity, 0);
    if (totalCapacity < input.partySize) {
      throw new Error(
        `Kapasitas total meja yang dipilih (${totalCapacity} orang) tidak mencukupi untuk jumlah tamu (${input.partySize} orang). Silakan pilih meja tambahan.`,
      );
    }

    const cancelToken = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

    const reservation = await createReservationTransaction(
      {
        name: input.guestName,
        phone: input.guestPhone,
        email: input.guestEmail,
      },
      {
        sessionId: input.sessionId,
        date: dateObj,
        partySize: input.partySize,
        specialRequest: input.specialRequest,
        status: ReservationStatus.pending,
        cancelToken,
        expiresAt,
      },
      input.tableIds,
    );

    appEvents.emit(EVENTS.RESERVATION_CREATED, {
      reservationId: reservation.id,
      status: reservation.status,
      guestId: reservation.guestId,
    });

    return {
      reservationId: reservation.id,
      expiresAt: expiresAt.toISOString(),
    };
  },

  cancelReservationAction: async (input: CancelReservationInput) => {
    const out = await cancelReservationByToken(input.cancelToken.trim());
    if (!out) {
      return { ok: false as const };
    }

    appEvents.emit(EVENTS.RESERVATION_CANCELLED, {
      reservationId: out.reservationId,
    });

    return { ok: true as const, reservationId: out.reservationId };
  },
};

/** Kontrak sprint — dipakai Dev B; mengikuti alur publik terbaru (reservation.service). */
export async function createReservation(input: PublicReservationInput) {
  const result = await createPublicReservation({
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestEmail: input.guestEmail,
    sessionId: input.sessionId,
    tableIds: input.tableIds,
    date: input.date,
    partySize: input.partySize,
    specialRequest: input.specialRequest,
  });

  return {
    reservationId: result.reservationId,
    expiresAt: result.expiresAt?.toISOString() ?? null,
    guestId: result.guestId,
    status: result.status,
    tableIds: result.tableIds,
    cancelToken: result.cancelToken,
  };
}

export const AdminReservationUseCase = {
  listReservationsAction: async (query: {
    date?: string;
    status?: string;
    sessionId?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) => {
    const filters: AdminReservationFilters = {};

    if (query.date) {
      const d = new Date(`${query.date}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid date format. Use YYYY-MM-DD");
      filters.date = d;
    }

    if (query.status) {
      if (!Object.values(ReservationStatus).includes(query.status as ReservationStatus)) {
        throw new Error(`Invalid status: ${query.status}`);
      }
      filters.status = query.status as ReservationStatus;
    }

    if (query.sessionId) filters.sessionId = query.sessionId;
    if (query.search) filters.search = query.search;
    if (query.page) filters.page = parseInt(query.page, 10);
    if (query.limit) filters.limit = parseInt(query.limit, 10);

    return getAdminReservations(filters);
  },

  updateReservationAction: async (input: {
    reservationId: string;
    status?: ReservationStatus;
    tableIds?: string[];
  }) => {
    const { reservationId, status, tableIds } = input;

    if (tableIds && tableIds.length > 0) {
      const reservation = await getReservationById(reservationId);
      if (!reservation) {
        throw new Error("Reservasi tidak ditemukan.");
      }

      await checkMultipleTablesAvailability(
        tableIds,
        reservation.sessionId,
        reservation.date,
        reservationId,
      );

      const tables = await prisma.table.findMany({
        where: { id: { in: tableIds } },
        select: { id: true, capacity: true, tableNumber: true },
      });
      const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

      if (totalCapacity < reservation.partySize) {
        throw new Error(
          `Kapasitas total meja yang dipilih (${totalCapacity} orang) tidak mencukupi untuk jumlah tamu reservasi (${reservation.partySize} orang).`,
        );
      }

      await updateReservationTablesTransaction(reservationId, tableIds);
    }

    if (status) {
      const updatedReservation = await updateReservationStatus(reservationId, status);

      if (status === ReservationStatus.cancelled) {
        appEvents.emit(EVENTS.RESERVATION_CANCELLED, {
          reservationId: updatedReservation.id,
        });
      }

      return { reservationId, updatedStatus: updatedReservation.status, tablesUpdated: !!tableIds };
    }

    return { reservationId, updatedStatus: null, tablesUpdated: !!tableIds };
  },
};
