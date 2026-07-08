import { prisma } from "@/infrastructure/database/prisma";
import type { NotificationType } from "@/generated/prisma/client";
import { dispatchAdminNotification } from "@/infrastructure/push-notification/notification-dispatcher";

export async function broadcastStaffNotification(params: {
  type: NotificationType;
  title: string;
  body: string;
  relatedId?: string | null;
  sendPush?: boolean;
}): Promise<void> {
  const staff = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["admin", "owner"] } },
    select: { id: true },
  });
  await Promise.all(
    staff.map((u) =>
      dispatchAdminNotification({
        userId: u.id,
        type: params.type,
        title: params.title,
        body: params.body,
        relatedId: params.relatedId ?? null,
        sendPush: params.sendPush,
      }),
    ),
  );
}
