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
    /** Scan QR / kolom cepat — UUID internal atau `check_in_token`. */
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

    const reservationDetails = await ReservationRepo.findReservationByIdForAdmin(reservationId);
    const guestName = reservationDetails?.guest.name ?? "Guest";
    const rawTables = (reservationDetails?.reservationTables || [])
      .map((rt) => rt.table.tableNumber)
      .filter(Boolean);
    const tableDisplay =
      rawTables.length > 0
        ? rawTables.map((t) => (t.toLowerCase().startsWith("table") ? t : `Table ${t}`)).join(", ")
        : "-";
    const sessionName = reservationDetails?.session.name ?? "";

    if (parsed.action === "no_show") {
      await markReservationNoShow(reservationId);
      await broadcastStaffNotification({
        type: "check_in",
        title: "Reservasi no-show",
        body: `Status no-show dicatat · ${guestName} (${tableDisplay})`,
        relatedId: reservationId,
      });
      return { reservationId, action: "no_show" as const, guestName, tableDisplay, sessionName };
    }

    await markReservationCheckedIn(reservationId, userId);

    await broadcastStaffNotification({
      type: "check_in",
      title: "Check-in tamu",
      body: `Check-in OK · ${guestName} (${tableDisplay})`,
      relatedId: reservationId,
    });

    return {
      reservationId,
      action: "check_in" as const,
      guestName,
      tableDisplay,
      sessionName,
    };
  },
};
