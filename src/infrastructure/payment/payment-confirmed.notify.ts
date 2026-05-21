import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";

/**
 * Dipanggil dari webhook Midtrans (Dev B) setelah pembayaran sukses.
 */
export async function notifyStaffPaymentConfirmed(params: {
  reservationId: string;
  /** Contoh: "Deposit Rp 150.000" */
  detail: string;
}): Promise<void> {
  await broadcastStaffNotification({
    type: "payment_confirmed",
    title: "Pembayaran dikonfirmasi",
    body: params.detail,
    relatedId: params.reservationId,
  });
}
