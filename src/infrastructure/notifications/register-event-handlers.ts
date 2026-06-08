import { prisma } from "@/infrastructure/database/prisma";
import { appEvents, EVENTS } from "@/lib/events";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";
import { notifyGuestReservationConfirmed } from "@/infrastructure/notifications/guest-notification.service";
import { ReservationStatus } from "@/generated/prisma/client";

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
      const guest = await prisma.guest.findUnique({
        where: { id: payload.guestId },
        select: { name: true },
      });

      const isConfirmed = payload.status === ReservationStatus.confirmed;
      await broadcastStaffNotification({
        type: "new_reservation",
        title: "Reservasi baru",
        body: guest
          ? isConfirmed
            ? `${guest.name} — confirmed`
            : `${guest.name} — menunggu pembayaran`
          : `Reservasi ${payload.reservationId.slice(0, 8)}…`,
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
      await broadcastStaffNotification({
        type: "cancellation",
        title: "Reservasi dibatalkan",
        body: `Reservasi ${payload.reservationId.slice(0, 8)}… dibatalkan tamu.`,
        relatedId: payload.reservationId,
      });
    } catch (error) {
      console.error("[notifications] reservasi_cancelled:", error);
    }
  });
}
