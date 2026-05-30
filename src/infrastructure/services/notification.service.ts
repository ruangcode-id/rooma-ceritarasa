/**
 * Mock Notification Service untuk Event System.
 *
 * Di branch feat/event-public ini, fungsinya hanya melakukan logging.
 * Dev C akan mengimplementasikan logic pengiriman WA (Fonnte) dan Email (Resend)
 * dengan cara mengganti/extend isi fungsi ini di branch mereka.
 *
 * Kontrak interface: src/domain/event/notification.types.ts
 */

import type { EventNotificationTrigger } from "@/domain/event/notification.types";

export const eventNotificationService = {
  /**
   * Trigger notifikasi WA dan Email ke PIC saat status event berubah.
   * Dev A memanggil ini setiap ada transisi status kritis di EventRequest.
   *
   * Status yang memicu trigger:
   * - offer_sent    → kirim WA/Email berisi link PDF penawaran
   * - deposit_paid  → kirim konfirmasi pembayaran DP
   * - accepted      → kirim konfirmasi event final
   * - cancelled     → kirim pemberitahuan pembatalan
   */
  async triggerEventNotification(payload: EventNotificationTrigger): Promise<void> {
    // TODO: Dev C — implementasikan pengiriman WA via Fonnte dan Email via Resend di sini
    console.log("[EventNotification] Trigger:", {
      type: payload.type,
      eventRequestId: payload.eventRequestId,
      picName: payload.picName,
      picPhone: payload.picPhone,
      eventDate: payload.eventDate,
    });
  },
};
