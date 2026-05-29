import { prisma } from "@/infrastructure/database/prisma";
import { appEvents, EVENTS } from "@/lib/events";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";

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
      await broadcastStaffNotification({
        type: "new_reservation",
        title: "Reservasi baru",
        body: guest
          ? `${guest.name} — menunggu pembayaran`
          : `Reservasi ${payload.reservationId.slice(0, 8)}…`,
        relatedId: payload.reservationId,
      });
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
