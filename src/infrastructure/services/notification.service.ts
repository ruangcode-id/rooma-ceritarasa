import type { EventNotificationTrigger } from "@/domain/event/notification.types";
import { dispatchEventGuestNotification } from "@/infrastructure/notifications/guest-notification.service";

export const eventNotificationService = {
  async triggerEventNotification(payload: EventNotificationTrigger): Promise<void> {
    await dispatchEventGuestNotification(payload);
  },
};
