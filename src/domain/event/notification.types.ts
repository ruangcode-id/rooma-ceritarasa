/**
 * Tipe data untuk event notification trigger.
 * Dibuat oleh Dev A — dikonsumsi oleh Dev C (WA Fonnte & Email Resend).
 *
 * Dev A memanggil `triggerEventNotification()` dari notification service
 * setiap kali status EventRequest berubah ke titik kritis.
 */

export type EventNotificationType =
  | "event_offer_sent"      // Admin kirim penawaran PDF → WA/Email ke PIC
  | "event_deposit_paid"    // Tamu bayar DP → WA/Email konfirmasi pembayaran
  | "event_accepted"        // Event dikonfirmasi sepenuhnya
  | "event_cancelled";      // Event dibatalkan

export interface EventNotificationTrigger {
  type: EventNotificationType;
  eventRequestId: string;
  picName: string;
  /** Nomor WA PIC — disimpan dalam format lokal (08xx) atau 62xx */
  picPhone: string;
  picEmail: string | null;
  eventDate: Date;
  /** URL PDF penawaran dari Cloudinary — disertakan saat type = 'event_offer_sent' */
  offerPdfUrl?: string;
  /** Harga penawaran — disertakan saat type = 'event_offer_sent' */
  offerPrice?: number;
}
