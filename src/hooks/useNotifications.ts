"use client";

import { useState, useEffect, useCallback } from "react";
import { handleApiError } from "@/lib/handle-api-error";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  body: string | null;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

interface NotificationsMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface NotificationsResponse {
  success: boolean;
  data: NotificationItem[];
  meta: NotificationsMeta;
}

export function useNotifications(page = 1, limit = 20) {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string; id: number } | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/notifications?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error(await handleApiError(res));
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  // Initial fetch and polling every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const mutate = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen to messages from Service Worker (Push Notifications)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
        const payload = event.data.payload;
        setToastMessage({
          title: payload.title,
          body: payload.body,
          id: Date.now(),
        });
        // Re-fetch notifications list
        mutate();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [mutate]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      try {
        const res = await fetch("/api/admin/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(await handleApiError(res));

        mutate();
      } catch (err) {
        console.error("Failed to mark notifications as read", err);
      }
    },
    [mutate]
  );

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error(await handleApiError(res));

      mutate();
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  }, [mutate]);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return {
    notifications: data?.data || [],
    meta: data?.meta,
    isLoading,
    isError: !!error,
    markAsRead,
    markAllRead,
    toastMessage,
    clearToast,
    mutate,
  };
}
