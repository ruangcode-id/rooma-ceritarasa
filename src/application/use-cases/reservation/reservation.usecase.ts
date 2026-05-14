import crypto from "crypto";
import { ReservationStatus } from "@/generated/prisma/client";
import { PublicReservationInput } from "@/validations/reservation.validation";
import { BlockedDateRepository } from "@/infrastructure/repositories/blocked-date.repository";
import { checkTableAvailability } from "@/features/tables/table.service";
import { createReservationTransaction } from "@/infrastructure/repositories/reservation.repository";
import { appEvents, EVENTS } from "@/lib/events";

/** Durasi jendela pembayaran dalam milidetik (15 menit). */
const PAYMENT_EXPIRY_MS = 15 * 60 * 1000;

const parseDateOnlyUTC = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
};

export const PublicReservationUseCase = {
  createReservationAction: async (input: PublicReservationInput) => {
    // 1. Cek Blokir Tanggal (langsung ke repository, tanpa requireRole)
    const dateObj = parseDateOnlyUTC(input.date);
    const isBlocked = await BlockedDateRepository.isDateBlocked(dateObj);
    if (isBlocked) {
      throw new Error(`Tanggal ${input.date} tidak tersedia untuk reservasi.`);
    }

    // 2. Validasi meja yang dipilih guest tersedia di sesi ini
    await checkTableAvailability(input.tableId, input.sessionId, input.date);

    // 3. Generate cancel_token & hitung expiry pembayaran
    const cancelToken = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

    // 4. Simpan ke DB
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
      [input.tableId],
    );

    // 5. Emit Event
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
