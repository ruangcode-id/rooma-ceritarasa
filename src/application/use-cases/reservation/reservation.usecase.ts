import crypto from "crypto";
import { ReservationStatus } from "@/generated/prisma/client";
import { PublicReservationInput } from "@/validations/reservation.validation";
import { BlockedDateRepository } from "@/infrastructure/repositories/blocked-date.repository";
import { checkMultipleTablesAvailability } from "@/features/tables/table.service";
import { createReservationTransaction } from "@/infrastructure/repositories/reservation.repository";
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
