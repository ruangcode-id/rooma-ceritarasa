import { prisma } from "@/infrastructure/database/prisma";
import type { NotificationType } from "@/generated/prisma/client";
import type { NotificationEntity, PushSubscriptionEntity } from "@/domain/notification/types";

function toNotificationEntity(row: {
  id: string;
  userId: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  isRead: boolean;
  relatedId: string | null;
  createdAt: Date;
}): NotificationEntity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.isRead,
    relatedId: row.relatedId,
    createdAt: row.createdAt,
  };
}

function toPushSubscriptionEntity(row: {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}): PushSubscriptionEntity {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    createdAt: row.createdAt,
  };
}

export type NotificationListFilters = {
  isRead?: boolean;
  type?: NotificationType;
};

export async function countNotificationsForUser(
  userId: string,
  filters: NotificationListFilters,
): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
  });
}

export async function findManyNotificationsForUser(
  userId: string,
  filters: NotificationListFilters,
  skip: number,
  take: number,
): Promise<NotificationEntity[]> {
  const rows = await prisma.notification.findMany({
    where: {
      userId,
      ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  return rows.map(toNotificationEntity);
}

export async function markNotificationsReadByIds(
  userId: string,
  ids: string[],
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, id: { in: ids } },
    data: { isRead: true },
  });
  return result.count;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}

export async function updateNotificationRead(
  userId: string,
  id: string,
  isRead: boolean,
): Promise<NotificationEntity | null> {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;
  const row = await prisma.notification.update({
    where: { id },
    data: { isRead },
  });
  return toNotificationEntity(row);
}

export async function createNotificationRecord(params: {
  userId: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  relatedId?: string | null;
}): Promise<NotificationEntity> {
  const row = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title ?? null,
      body: params.body ?? null,
      relatedId: params.relatedId ?? null,
    },
  });
  return toNotificationEntity(row);
}

export async function replacePushSubscriptionForEndpoint(params: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<PushSubscriptionEntity> {
  const row = await prisma.$transaction(async (tx) => {
    await tx.pushSubscription.deleteMany({
      where: { endpoint: params.endpoint },
    });
    return tx.pushSubscription.create({
      data: {
        userId: params.userId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
      },
    });
  });
  return toPushSubscriptionEntity(row);
}

export async function findPushSubscriptionsByUserId(
  userId: string,
): Promise<PushSubscriptionEntity[]> {
  const rows = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPushSubscriptionEntity);
}

export async function deletePushSubscriptionForUser(
  userId: string,
  id: string,
): Promise<boolean> {
  try {
    await prisma.pushSubscription.delete({
      where: { id, userId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
