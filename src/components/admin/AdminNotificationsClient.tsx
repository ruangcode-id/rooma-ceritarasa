"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { enUS as localeId } from "date-fns/locale";
import {
  Bell,
  CircleNotch,
  CalendarCheck,
  CreditCard,
  MapPinLine,
  CalendarX,
  Info
} from "@phosphor-icons/react";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";

function getNotificationIcon(type: string) {
  switch (type) {
    case "new_reservation":
      return <CalendarCheck size={20} className="text-blue-500" />;
    case "cancellation":
      return <CalendarX size={20} className="text-red-500" />;
    case "check_in":
      return <MapPinLine size={20} className="text-green-500" />;
    case "payment_confirmed":
      return <CreditCard size={20} className="text-emerald-500" />;
    default:
      return <Info size={20} className="text-slate-500" />;
  }
}

function getNotificationLink(type: string, relatedId?: string | null) {
  switch (type) {
    case "new_reservation":
    case "cancellation":
    case "check_in":
      return relatedId ? `/admin/reservations?detail=${relatedId}` : "/admin/reservations";
    case "payment_confirmed":
      return "/admin/payments";
    default:
      return "/admin/notifications";
  }
}

export default function AdminNotificationsClient() {
  const {
    notifications,
    isLoading: isNotifLoading,
    markAsRead,
    markAllRead,
    toastMessage,
    clearToast,
  } = useNotifications(1, 50); // Just fetch 50 for now

  // Simple Toast UI
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  const unreadCount = notifications.filter((n: NotificationItem) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Notifications List */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Notification History</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {isNotifLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <CircleNotch size={32} className="animate-spin mb-4" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Bell size={48} weight="light" className="mb-4 opacity-50" />
            <p>No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notif: NotificationItem) => (
              <li
                key={notif.id}
                className={`flex items-start gap-4 p-5 sm:px-6 transition-colors hover:bg-slate-50 ${
                  !notif.isRead ? "bg-primary/2" : ""
                }`}
              >
                <div className={`mt-1 shrink-0 rounded-full p-2 ${!notif.isRead ? "bg-primary/10" : "bg-slate-100"}`}>
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className={`text-sm ${!notif.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                      {notif.title || "New Notification"}
                    </h4>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${!notif.isRead ? "text-slate-700" : "text-slate-500"}`}>
                    {notif.body}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <Link
                      href={getNotificationLink(notif.type, notif.relatedId)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View Details
                    </Link>
                    {!notif.isRead && (
                      <button
                        onClick={() => markAsRead([notif.id])}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
                {!notif.isRead && (
                  <div className="shrink-0 pt-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
