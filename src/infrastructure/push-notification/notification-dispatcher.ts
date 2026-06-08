import type { NotificationType } from "@/generated/prisma/client";
import { createNotificationRecord } from "@/infrastructure/repositories/notification.repository";
import { isWebPushConfigured, sendWebPushToUser } from "@/infrastructure/push-notification/web-push";
import type { NotificationEntity } from "@/domain/notification/types";

export type DispatchNotificationParams = {
  userId: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  relatedId?: string | null;
  /**
   * Jika true (default), kirim Web Push bila VAPID terkonfigurasi.
   * Dev A/B bisa panggil dengan sendPush: false lalu handle channel lain.
   */
  sendPush?: boolean;
};

/**
 * Kerangka pusat: simpan record notifikasi in-app, lalu opsional kirim Web Push.
 * Dipanggil nanti dari use-case/event (reservasi, payment, dll.).
 */
export async function dispatchAdminNotification(
  params: DispatchNotificationParams,
): Promise<NotificationEntity> {
  const row = await createNotificationRecord({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    relatedId: params.relatedId,
  });

  const shouldPush = params.sendPush !== false && isWebPushConfigured();
  if (shouldPush) {
    const title = params.title?.trim() || "Rooma Ceritarasa";
    const body = params.body?.trim() || "";
    await sendWebPushToUser(params.userId, { title, body });
  }

  return row;
}
