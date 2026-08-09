import type { NotificationType } from "@/generated/prisma/client";
import { createNotificationRecord } from "@/infrastructure/repositories/notification.repository";
import type { NotificationEntity } from "@/domain/notification/types";

export type DispatchNotificationParams = {
  userId: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  relatedId?: string | null;
};

/**
 * Kerangka pusat: simpan record notifikasi in-app.
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

  return row;
}
