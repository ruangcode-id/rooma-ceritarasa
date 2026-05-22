import webpush from "web-push";
import { getVapidConfig } from "@/config/env";
import {
  deletePushSubscriptionByEndpoint,
  findPushSubscriptionsByUserId,
} from "@/infrastructure/repositories/notification.repository";
import type { PushSubscriptionEntity } from "@/domain/notification/types";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  const cfg = getVapidConfig();
  if (!cfg) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    vapidConfigured = true;
  }
  return true;
}

export function isWebPushConfigured(): boolean {
  return getVapidConfig() !== null;
}

export function getVapidPublicKeyAndSubject(): { publicKey: string; subject: string } | null {
  const cfg = getVapidConfig();
  if (!cfg) return null;
  return { publicKey: cfg.publicKey, subject: cfg.subject };
}

export type WebPushPayload = {
  title: string;
  body: string;
  /** Opsional: path relatif untuk deep-link di PWA */
  url?: string;
};

function buildPayloadString(payload: WebPushPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/admin/dashboard",
  });
}

function subscriptionToWebPushShape(sub: PushSubscriptionEntity) {
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
}

async function sendOne(sub: PushSubscriptionEntity, payload: string): Promise<void> {
  if (!ensureVapidConfigured()) return;
  try {
    await webpush.sendNotification(subscriptionToWebPushShape(sub), payload, {
      TTL: 86_400,
    });
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    if (status === 404 || status === 410) {
      await deletePushSubscriptionByEndpoint(sub.endpoint);
    } else {
      console.error("[web-push] send failed:", err);
    }
  }
}

/** Kirim satu notifikasi push ke satu subscription (tanpa menyentuh DB notifikasi). */
export async function sendWebPushToSubscription(
  sub: PushSubscriptionEntity,
  payload: WebPushPayload,
): Promise<void> {
  if (!isWebPushConfigured()) return;
  await sendOne(sub, buildPayloadString(payload));
}

/** Kirim ke semua device milik user. Subscription invalid (410/404) dihapus otomatis. */
export async function sendWebPushToUser(
  userId: string,
  payload: WebPushPayload,
): Promise<void> {
  if (!isWebPushConfigured()) return;
  const subs = await findPushSubscriptionsByUserId(userId);
  const body = buildPayloadString(payload);
  await Promise.all(subs.map((s) => sendOne(s, body)));
}
