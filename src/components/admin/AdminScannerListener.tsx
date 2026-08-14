"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle, XCircle, MapPinLine, X } from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type CheckInResultToast = {
  id: string;
  type: "success" | "error";
  title: string;
  message: string;
  guestName?: string;
  tableDisplay?: string;
};

// Simple Web Audio API chime sound for instant audio feedback
function playChimeSound(type: "success" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Ignore audio errors if audio context is blocked
  }
}

export function AdminScannerListener() {
  const [toast, setToast] = useState<CheckInResultToast | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processCheckInCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || isProcessing) return;

    setIsProcessing(true);

    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in", lookup: code }),
      });

      if (!res.ok) {
        throw new Error(await handleApiError(res));
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error ?? "Check-in failed. Code is invalid.");
      }

      playChimeSound("success");
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Check-In Successful!",
        message: `Reservation ${data.data.reservationId.slice(0, 8).toUpperCase()} checked in.`,
        guestName: data.data.guestName,
        tableDisplay: data.data.tableDisplay,
      });

      // Broadcast to other open Admin tabs
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const channel = new BroadcastChannel("rooma_admin_notifications");
          channel.postMessage({
            type: "CHECK_IN_ALERT",
            title: "Guest Check-In",
            body: `Check-in OK · ${data.data.guestName} (${data.data.tableDisplay})`,
            url: `/admin/reservations?detail=${data.data.reservationId}`,
          });
          channel.close();
        } catch {
          // Ignore broadcast error
        }
      }

      // Auto dismiss after 5 seconds
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      playChimeSound("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Check-In Failed",
        message: errMsg,
      });

      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      // If user presses Enter
      if (e.key === "Enter") {
        const candidate = bufferRef.current.trim();
        bufferRef.current = "";

        if (candidate.length >= 3) {
          // If candidate starts with CK- or is rapid scan or not in focused text input
          if (candidate.toUpperCase().startsWith("CK-") || !isInputFocused || candidate.length >= 8) {
            if (!isInputFocused) {
              e.preventDefault();
            }
            void processCheckInCode(candidate);
          }
        }
        return;
      }

      // Check character input
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const timeDiff = now - lastKeyTimeRef.current;
        lastKeyTimeRef.current = now;

        // Reset buffer if delay between keys is too long (> 200ms) unless buffer starts with CK-
        if (timeDiff > 200 && !bufferRef.current.toUpperCase().startsWith("CK-")) {
          bufferRef.current = "";
        }

        bufferRef.current += e.key;

        // Auto-flush timeout for scanners without Enter key suffix
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          const candidate = bufferRef.current.trim();
          if (candidate.toUpperCase().startsWith("CK-") && candidate.length >= 6) {
            bufferRef.current = "";
            void processCheckInCode(candidate);
          }
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isProcessing, processCheckInCode]);

  if (!toast) return null;

  return (
    <div className="fixed top-5 right-5 z-100 flex max-w-md w-full animate-in slide-in-from-top-5 duration-300 pointer-events-auto">
      <div
        className={`w-full rounded-2xl p-4 text-white shadow-2xl backdrop-blur-xl flex items-start gap-3 text-left transition-all group relative overflow-hidden ${
          toast.type === "success"
            ? "bg-slate-950/95 border border-green-500/40 shadow-green-950/30 hover:border-green-400"
            : "bg-slate-950/95 border border-red-500/40 shadow-red-950/30 hover:border-red-400"
        }`}
      >
        {/* Glow accent */}
        <div className={`absolute -right-12 -bottom-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
          toast.type === "success" ? "bg-green-500/10" : "bg-red-500/10"
        }`}></div>

        <div className="shrink-0 mt-0.5">
          {toast.type === "success" ? (
            <div className="rounded-xl bg-green-500/20 p-2.5 text-green-400 border border-green-500/30">
              <CheckCircle size={24} weight="fill" />
            </div>
          ) : (
            <div className="rounded-xl bg-red-500/20 p-2.5 text-red-400 border border-red-500/30">
              <XCircle size={24} weight="fill" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
            toast.type === "success" ? "text-green-400" : "text-red-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
              toast.type === "success" ? "bg-green-400" : "bg-red-400"
            }`}></span>
            Global Front Desk Scanner
          </div>
          <h4 className={`text-sm font-bold text-white mt-0.5 transition-colors ${
            toast.type === "success" ? "group-hover:text-green-300" : "group-hover:text-red-300"
          }`}>
            {toast.title}
          </h4>
          
          {toast.guestName ? (
            <p className="text-xs text-slate-300 mt-1 leading-relaxed wrap-break-word">
              <span className="font-bold text-white">{toast.guestName}</span> · Assigned Table: <span className="font-bold text-white">{toast.tableDisplay}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-300 mt-1 leading-relaxed wrap-break-word">{toast.message}</p>
          )}
        </div>

        <button
          onClick={() => setToast(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
