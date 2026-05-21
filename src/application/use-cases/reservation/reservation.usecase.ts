import crypto from "crypto";
import { ReservationStatus } from "@/generated/prisma/client";
import { PublicReservationInput } from "@/validations/reservation.validation";
import { BlockedDateRepository } from "@/infrastructure/repositories/blocked-date.repository";
import { checkTableAvailability } from "@/features/tables/table.service";
import {
  cancelReservationByToken,
  createReservationTransaction,
} from "@/infrastructure/repositories/reservation.repository";
import { appEvents, EVENTS } from "@/lib/events";
import type { CancelReservationInput } from "@/validations/reservation.validation";

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

/** Alias kontrak sprint — Dev B memakai reservationId dari hasil create. */
export async function createReservation(input: PublicReservationInput) {
  return PublicReservationUseCase.createReservationAction(input);
}
