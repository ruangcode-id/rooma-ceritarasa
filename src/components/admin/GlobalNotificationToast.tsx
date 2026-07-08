"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "@phosphor-icons/react";

export default function GlobalNotificationToast() {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string; id: number; url?: string } | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
        const payload = event.data.payload;
        setToastMessage({
          title: payload.title,
          body: payload.body,
          url: payload.data?.url,
          id: Date.now(),
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!toastMessage) return null;

  const handleClick = () => {
    if (toastMessage.url) {
      router.push(toastMessage.url);
    }
    setToastMessage(null);
  };

  return (
    <div 
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-900 p-4 text-white shadow-2xl animate-in slide-in-from-bottom-5 hover:bg-slate-800 transition-colors"
    >
      <Bell size={24} weight="fill" className="text-primary mt-0.5" />
      <div className="pr-4">
        <h4 className="text-sm font-semibold">{toastMessage.title}</h4>
        <p className="mt-1 text-sm text-slate-300">{toastMessage.body}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setToastMessage(null);
        }}
        className="absolute top-4 right-4 text-slate-400 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}
