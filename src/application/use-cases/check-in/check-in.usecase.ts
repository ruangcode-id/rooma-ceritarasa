import { z } from "zod";
import * as ReservationRepo from "@/infrastructure/repositories/reservation.repository";
import {
  markReservationCheckedIn,
  markReservationNoShow,
} from "@/infrastructure/repositories/check-in.repository";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";

export const adminCheckInBodySchema = z
  .object({
    action: z.enum(["check_in", "no_show"]).default("check_in"),
    reservationId: z.string().uuid().optional(),
    /** Scan QR / kolom cepat — UUID atau `cancel_token`. */
    lookup: z.string().trim().min(1).max(200).optional(),
  })
  .refine((b) => b.reservationId != null || (b.lookup != null && b.lookup.length > 0), {
    message: "Berikan reservationId atau lookup.",
    path: ["reservationId"],
  });

export type AdminCheckInBody = z.infer<typeof adminCheckInBodySchema>;

async function resolveReservationId(body: AdminCheckInBody): Promise<string | null> {
  if (body.reservationId) {
    const r = await ReservationRepo.findReservationByIdForAdmin(body.reservationId);
    return r?.id ?? null;
  }
  if (body.lookup) {
    const r = await ReservationRepo.findReservationByLookup(body.lookup);
    return r?.id ?? null;
  }
  return null;
}

export const CheckInUseCase = {
  async execute(userId: string, body: unknown) {
    const parsed = adminCheckInBodySchema.parse(body);
    const reservationId = await resolveReservationId(parsed);
    if (!reservationId) {
      throw new Error("Reservation not found");
    }

    if (parsed.action === "no_show") {
      await markReservationNoShow(reservationId);
      await broadcastStaffNotification({
        type: "check_in",
        title: "Reservasi no-show",
        body: `Status no-show dicatat · ${reservationId.slice(0, 8)}…`,
        relatedId: reservationId,
      });
      return { reservationId, action: "no_show" as const };
    }

    await markReservationCheckedIn(reservationId, userId);

    await broadcastStaffNotification({
      type: "check_in",
      title: "Check-in tamu",
      body: `Check-in OK · ${reservationId.slice(0, 8)}…`,
      relatedId: reservationId,
    });
    return { reservationId, action: "check_in" as const };
  },
};
