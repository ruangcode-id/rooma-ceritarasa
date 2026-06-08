import { z } from "zod";

export const NOTIFICATION_TYPE_VALUES = [
  "new_reservation",
  "cancellation",
  "check_in",
  "payment_confirmed",
] as const;

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  type: z.enum(NOTIFICATION_TYPE_VALUES).optional(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(2000),
    auth: z.string().min(1).max(500),
  }),
});

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionBodySchema>;

export const markNotificationsReadBodySchema = z.union([
  z.object({ markAllRead: z.literal(true) }),
  z.object({
    ids: z.array(z.string().uuid()).min(1).max(200),
  }),
]);

export type MarkNotificationsReadBody = z.infer<typeof markNotificationsReadBodySchema>;

export const patchNotificationReadSchema = z.object({
  isRead: z.boolean(),
});
