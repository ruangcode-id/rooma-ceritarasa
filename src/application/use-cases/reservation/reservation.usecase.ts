import crypto from "crypto";
import { ReservationStatus } from "@/generated/prisma/client";
import { PublicReservationInput } from "@/validations/reservation.validation";
import { BlockedDateRepository } from "@/infrastructure/repositories/blocked-date.repository";
import { checkMultipleTablesAvailability } from "@/features/tables/table.service";
import {
  createReservationTransaction,
  getAdminReservations,
  updateReservationStatus,
  getReservationById,
  updateReservationTablesTransaction,
  AdminReservationFilters,
} from "@/infrastructure/repositories/reservation.repository";
import { appEvents, EVENTS } from "@/lib/events";
import { prisma } from "@/infrastructure/database/prisma";

/** Durasi jendela pembayaran dalam milidetik (15 menit). */
const PAYMENT_EXPIRY_MS = 15 * 60 * 1000;

const parseDateOnlyUTC = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
};

export const PublicReservationUseCase = {
  createReservationAction: async (input: PublicReservationInput) => {
    // 1. Cek Blokir Tanggal
    const dateObj = parseDateOnlyUTC(input.date);
    const isBlocked = await BlockedDateRepository.isDateBlocked(dateObj);
    if (isBlocked) {
      throw new Error(`Tanggal ${input.date} tidak tersedia untuk reservasi.`);
    }

    // 2. Validasi semua meja yang dipilih tersedia di sesi ini (tidak bentrok reservasi lain)
    await checkMultipleTablesAvailability(input.tableIds, input.sessionId, input.date);

    // 3. Validasi kapasitas gabungan meja >= jumlah tamu (Opsi 1 — Blokir ketat)
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

    // 4. Generate cancel_token & hitung expiry pembayaran
    const cancelToken = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

    // 5. Simpan ke DB
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

    // 6. Emit Event
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
};

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

  /**
   * Update status DAN/ATAU meja reservasi.
   * Jika tableIds dikirim: validasi ketersediaan + validasi kapasitas ketat (Opsi 1),
   * lalu ganti semua meja reservasi secara atomik.
   * Jika status dikirim: update status, emit event jika cancelled.
   */
  updateReservationAction: async (input: {
    reservationId: string;
    status?: ReservationStatus;
    tableIds?: string[];
  }) => {
    const { reservationId, status, tableIds } = input;

    // ── BAGIAN 1: Update Meja (jika tableIds dikirim) ──
    if (tableIds && tableIds.length > 0) {
      // 1a. Ambil data reservasi yang akan diedit
      const reservation = await getReservationById(reservationId);
      if (!reservation) {
        throw new Error("Reservasi tidak ditemukan.");
      }

      // 1b. Cek ketersediaan meja (dengan pengecualian meja milik reservasi sendiri)
      await checkMultipleTablesAvailability(
        tableIds,
        reservation.sessionId,
        reservation.date,
        reservationId,
      );

      // 1c. Ambil kapasitas fisik masing-masing meja untuk validasi total
      const tables = await prisma.table.findMany({
        where: { id: { in: tableIds } },
        select: { id: true, capacity: true, tableNumber: true },
      });
      const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

      // 1d. Opsi 1 — Blokir jika kapasitas gabungan kurang dari jumlah tamu
      if (totalCapacity < reservation.partySize) {
        throw new Error(
          `Kapasitas total meja yang dipilih (${totalCapacity} orang) tidak mencukupi untuk jumlah tamu reservasi (${reservation.partySize} orang).`,
        );
      }

      // 1e. Eksekusi penggantian meja secara atomik
      await updateReservationTablesTransaction(reservationId, tableIds);
    }

    // ── BAGIAN 2: Update Status (jika status dikirim) ──
    if (status) {
      const updatedReservation = await updateReservationStatus(reservationId, status);

      // Emit event untuk Dev C agar notifikasi pembatalan terkirim
      if (status === ReservationStatus.cancelled) {
        appEvents.emit(EVENTS.RESERVATION_CANCELLED, {
          reservationId: updatedReservation.id,
          guestId: updatedReservation.guestId,
        });
      }

      return { reservationId, updatedStatus: updatedReservation.status, tablesUpdated: !!tableIds };
    }

    return { reservationId, updatedStatus: null, tablesUpdated: !!tableIds };
  },
};
