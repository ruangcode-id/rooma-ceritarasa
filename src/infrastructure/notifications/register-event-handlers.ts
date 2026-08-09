import { prisma } from "@/infrastructure/database/prisma";
import { appEvents, EVENTS } from "@/lib/events";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";
import { notifyGuestReservationConfirmed } from "@/infrastructure/notifications/guest-notification.service";
import { ReservationStatus } from "@/generated/prisma/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type ReservationCreatedPayload = {
  reservationId: string;
  status: string;
  guestId: string;
};

type ReservationCancelledPayload = {
  reservationId: string;
};

let registered = false;

export function registerNotificationEventHandlers(): void {
  if (registered) return;
  registered = true;

  appEvents.on(EVENTS.RESERVATION_CREATED, async (payload: ReservationCreatedPayload) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: payload.reservationId },
        include: {
          guest: { select: { name: true, phone: true } },
          session: { select: { name: true } },
        },
      });

      const isConfirmed = payload.status === ReservationStatus.confirmed;
      let title = isConfirmed ? "Reservasi Baru (Terkonfirmasi)" : "Reservasi Baru (Menunggu DP)";
      let body = `Reservasi #${payload.reservationId.slice(0, 8).toUpperCase()}`;

      if (reservation) {
        const formattedDate = format(new Date(reservation.date), "dd MMM yyyy", { locale: localeId });
        const statusLabel = isConfirmed ? "Status: Terkonfirmasi" : "Status: Menunggu Pembayaran DP";
        body = `Atas nama ${reservation.guest.name} (${reservation.partySize} pax) untuk tanggal ${formattedDate} (${reservation.session.name}). ${statusLabel}.`;
      }

      await broadcastStaffNotification({
        type: "new_reservation",
        title,
        body,
        relatedId: payload.reservationId,
      });

      if (isConfirmed) {
        await notifyGuestReservationConfirmed(payload.reservationId);
      }
    } catch (error) {
      console.error("[notifications] reservasi_created:", error);
    }
  });

  appEvents.on(EVENTS.RESERVATION_CANCELLED, async (payload: ReservationCancelledPayload) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: payload.reservationId },
        include: {
          guest: { select: { name: true } },
        },
      });

      const guestText = reservation?.guest.name ? ` atas nama ${reservation.guest.name}` : "";
      await broadcastStaffNotification({
        type: "cancellation",
        title: "Reservasi Dibatalkan",
        body: `Reservasi #${payload.reservationId.slice(0, 8).toUpperCase()}${guestText} telah dibatalkan oleh tamu.`,
        relatedId: payload.reservationId,
      });
    } catch (error) {
      console.error("[notifications] reservasi_cancelled:", error);
    }
  });
}
