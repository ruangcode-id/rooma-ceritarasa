"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { handleApiError } from "@/lib/handle-api-error";

const subscribeToPushSupport = () => () => {};

function getPushSupportSnapshot() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

function getServerPushSupportSnapshot() {
  return false;
}

async function getCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.pushManager.getSubscription() ?? null;
}

export function usePushSubscription() {
  const isSupported = useSyncExternalStore(
    subscribeToPushSupport,
    getPushSupportSnapshot,
    getServerPushSupportSnapshot
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported) return;

    let ignore = false;

    void getCurrentPushSubscription()
      .then((subscription) => {
        if (!ignore) setIsSubscribed(!!subscription);
      })
      .catch((err: unknown) => {
        if (!ignore) console.error("Error checking push subscription:", err);
      });

    return () => {
      ignore = true;
    };
  }, [isSupported]);

  async function checkSubscription() {
    try {
      const subscription = await getCurrentPushSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking push subscription:", err);
    }
  }

  async function subscribe() {
    setError(null);
    setIsLoading(true);

    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker is not supported in this browser.");
      }

      // Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission for notifications was denied.");
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Fetch VAPID key
      const vapidRes = await fetch("/api/admin/notifications/vapid-public-key");
      if (!vapidRes.ok) {
        throw new Error(await handleApiError(vapidRes));
      }
      const vapidData = await vapidRes.json();
      if (!vapidData.success || !vapidData.data.publicKey) {
        throw new Error("Invalid VAPID public key response");
      }

      const vapidPublicKey = urlBase64ToUint8Array(vapidData.data.publicKey);

      // Subscribe to Push Manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      // Send Subscription to Backend
      const subscriptionRes = await fetch("/api/admin/notifications/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!subscriptionRes.ok) {
        throw new Error(await handleApiError(subscriptionRes));
      }

      setIsSubscribed(true);
    } catch (err: unknown) {
      console.error("Failed to subscribe to push notifications", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return { isSupported, isSubscribed, isLoading, error, subscribe, checkSubscription };
}

// Utility function to convert Base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
