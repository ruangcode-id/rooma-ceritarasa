"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPinLine, CalendarCheck, X, ArrowRight, Crown } from "@phosphor-icons/react";

type NotificationToast = {
  id: string;
  type: "check_in" | "new_reservation" | "general";
  title: string;
  body: string;
  url?: string;
  timestamp: number;
};

// Web Audio API chime for pop-up notification sound
function playNotificationChime(type: "check_in" | "new_reservation" | "general") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "check_in") {
      // Gentle double chime (D5 -> A5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Ignore audio errors if browser blocks autoplay audio
  }
}

export default function GlobalNotificationToast() {
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<NotificationToast | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef(false);

  const triggerToast = useCallback((toast: NotificationToast) => {
    if (seenIdsRef.current.has(toast.id)) return;
    seenIdsRef.current.add(toast.id);

    setActiveToast(toast);
    playNotificationChime(toast.type);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setActiveToast((current) => (current?.id === toast.id ? null : current));
    }, 6000);
  }, []);

  // Poll /api/admin/notifications every 6 seconds to detect new check-ins real-time
  useEffect(() => {
    let isSubscribed = true;

    const checkNewNotifications = async () => {
      try {
        const res = await fetch("/api/admin/notifications?limit=5");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;

        const notifs = data.data as Array<{
          id: string;
          type: string;
          title: string | null;
          body: string | null;
          relatedId: string | null;
          isRead: boolean;
          createdAt: string;
        }>;

        // Skip first initial load to prevent popping up old historical notifications
        if (!initialFetchDoneRef.current) {
          notifs.forEach((n) => seenIdsRef.current.add(n.id));
          initialFetchDoneRef.current = true;
          return;
        }

        // Look for unseen check_in or new_reservation notifications
        for (const notif of notifs) {
          if (!seenIdsRef.current.has(notif.id) && isSubscribed) {
            const notifType = notif.type === "check_in" ? "check_in" : notif.type === "new_reservation" ? "new_reservation" : "general";
            const targetUrl = notif.relatedId ? `/admin/reservations?detail=${notif.relatedId}` : "/admin/reservations";

            triggerToast({
              id: notif.id,
              type: notifType,
              title: notif.title || "Check-In Notification",
              body: notif.body || "A guest has checked in for their reservation.",
              url: targetUrl,
              timestamp: Date.now(),
            });
            break; // Show one toast at a time
          }
        }
      } catch {
        // Silently handle fetch errors in background poller
      }
    };

    void checkNewNotifications();
    const interval = setInterval(() => {
      void checkNewNotifications();
    }, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [triggerToast]);

  // Unlock Web Audio API on first user interaction so chime plays reliably
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        }
      } catch {
        // ignore errors
      }
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // Listen to BroadcastChannel cross-tab events
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("rooma_admin_notifications");

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data && event.data.type === "CHECK_IN_ALERT") {
        triggerToast({
          id: `bc-${Date.now()}`,
          type: "check_in",
          title: event.data.title || "Check-In Tamu",
          body: event.data.body || "Tamu telah di-check-in.",
          url: event.data.url || "/admin/reservations",
          timestamp: Date.now(),
        });
      }
    };

    channel.addEventListener("message", handleBroadcast);
    return () => {
      channel.removeEventListener("message", handleBroadcast);
      channel.close();
    };
  }, [triggerToast]);

  if (!activeToast) return null;

  const isVip = activeToast.title.includes("👑") || activeToast.title.includes("VIP");

  const handleCardClick = () => {
    if (isVip) {
      if (activeToast.id.startsWith("bc-")) {
        router.push("/admin/notifications");
      } else {
        router.push(`/admin/notifications?detailNotif=${activeToast.id}`);
      }
    } else if (activeToast.url) {
      router.push(activeToast.url);
    }
    setActiveToast(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-100 flex max-w-md w-full animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div
        onClick={handleCardClick}
        className={`w-full rounded-2xl p-4 text-white shadow-2xl backdrop-blur-xl flex items-start gap-3 text-left cursor-pointer transition-all group relative overflow-hidden ${
          isVip 
            ? "bg-linear-to-br from-[#2a080d] via-[#150306] to-[#0a0103] border-2 border-amber-500/60 shadow-amber-900/50 hover:border-amber-400" 
            : "bg-slate-950/95 border border-amber-500/40 shadow-amber-950/40 hover:border-amber-400"
        }`}
      >
        {/* Glow accent */}
        <div className={`absolute -right-12 -bottom-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${isVip ? "bg-amber-500/20" : "bg-amber-500/10"}`}></div>

        {/* Icon Badge */}
        <div className="shrink-0 mt-0.5">
          {isVip ? (
            <div className="rounded-xl bg-linear-to-br from-amber-400 to-amber-600 p-2.5 text-black shadow-lg shadow-amber-500/30">
              <Crown size={24} weight="fill" />
            </div>
          ) : activeToast.type === "check_in" ? (
            <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400 border border-amber-500/30">
              <MapPinLine size={24} weight="fill" />
            </div>
          ) : (
            <div className="rounded-xl bg-blue-500/20 p-2.5 text-blue-400 border border-blue-500/30">
              <CalendarCheck size={24} weight="fill" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${isVip ? "text-amber-300" : "text-amber-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isVip ? "bg-amber-300" : "bg-amber-400"}`}></span>
            {isVip ? "VIP Arrival Alert" : activeToast.type === "check_in" ? "Guest Check-In Alert" : "Reservation Update"}
          </div>

          <h4 className="text-sm font-bold text-white mt-0.5 group-hover:text-amber-300 transition-colors">
            {activeToast.title}
          </h4>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed wrap-break-word">
            {activeToast.body}
          </p>

          {activeToast.url && (
            <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
              <span>View Reservation Details</span>
              <ArrowRight size={12} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveToast(null);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          aria-label="Close notification"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
