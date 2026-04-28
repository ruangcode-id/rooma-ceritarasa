import type { NotificationType } from "@/generated/prisma/client";

export interface NotificationEntity {
  id: string;
  userId: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  isRead: boolean;
  relatedId: string | null;
  createdAt: Date;
}

export interface PushSubscriptionEntity {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}
