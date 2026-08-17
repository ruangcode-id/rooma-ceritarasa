import { z } from "zod";
import * as ReservationRepo from "@/infrastructure/repositories/reservation.repository";
import {
  markReservationCheckedIn,
  markReservationNoShow,
} from "@/infrastructure/repositories/check-in.repository";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";
import { prisma } from "@/infrastructure/database/prisma";

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

async function extractLookupToken(lookup: string): Promise<string> {
  let trimmed = lookup.trim();
  trimmed = trimmed.split("?")[0]?.trim() ?? trimmed;
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").filter(Boolean);
    trimmed = parts[parts.length - 1] ?? trimmed;
  }
  return trimmed;
}

export const CheckInUseCase = {
  async execute(userId: string, body: unknown) {
    const parsed = adminCheckInBodySchema.parse(body);

    // 1. Check if lookup is a VIP Card Token
    if (parsed.lookup) {
      const token = await extractLookupToken(parsed.lookup);
      const vipCard = await prisma.vipCard.findUnique({
        where: { token },
        include: { guest: true },
      });

      if (vipCard && vipCard.isActive) {
        const guestName = vipCard.guest.name;
        const tableDisplay = "VIP Area / Meja VIP";
        const guestNotes = vipCard.benefits || vipCard.guest.notes || null;

        await prisma.vipArrivalLog.create({
          data: {
            guestId: vipCard.guestId,
            checkedInBy: userId,
            notes: guestNotes,
          },
        });

        await broadcastStaffNotification({
          type: "check_in",
          title: "👑 VIP Arrival Alert",
          body: `VIP Guest Arrival · ${guestName} (Please direct to VIP Table)`,
          relatedId: vipCard.guestId,
        });

        return {
          reservationId: null,
          action: "check_in" as const,
          guestName,
          tableDisplay,
          sessionName: "VIP Walk-in",
          isVip: true,
          isVipWalkIn: true,
          guestNotes,
        };
      }
    }

    // 2. Standard Reservation Lookup
    const reservationId = await resolveReservationId(parsed);
    if (!reservationId) {
      throw new Error("Data tidak ditemukan. Pastikan QR atau Token valid.");
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
    const isVip = reservationDetails?.guest.isVip || false;
    const guestNotes = reservationDetails?.specialRequest || reservationDetails?.guest.notes || null;

    if (parsed.action === "no_show") {
      await markReservationNoShow(reservationId);
      await broadcastStaffNotification({
        type: "check_in",
        title: isVip ? "👑 VIP Reservation No-Show" : "Reservation No-Show",
        body: `No-show status recorded · ${guestName} (${tableDisplay})`,
        relatedId: reservationId,
      });
      return { reservationId, action: "no_show" as const, guestName, tableDisplay, sessionName, isVip, guestNotes };
    }

    await markReservationCheckedIn(reservationId, userId);

    await broadcastStaffNotification({
      type: "check_in",
      title: isVip ? "👑 VIP Check-In Alert" : "Guest Check-In",
      body: `Check-in OK · ${guestName} (${tableDisplay})`,
      relatedId: reservationId,
    });

    return {
      reservationId,
      action: "check_in" as const,
      guestName,
      tableDisplay,
      sessionName,
      isVip,
      guestNotes,
    };
  },
};
