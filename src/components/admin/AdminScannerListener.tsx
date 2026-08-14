"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { handleApiError } from "@/lib/handle-api-error";
import type { NotificationToast } from "./GlobalNotificationToast";

export function AdminScannerListener() {
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

      // Dispatch local toast for instant UI response (GlobalNotificationToast handles the UI and Chime)
      window.dispatchEvent(
        new CustomEvent<NotificationToast & { relatedId?: string }>("LOCAL_TOAST_EVENT", {
          detail: {
            id: `local-${Date.now()}`,
            type: "success",
            title: data.data.isVipWalkIn ? "VIP Check-In Successful!" : "Check-In Successful!",
            body: data.data.reservationId
              ? `Reservation ${data.data.reservationId.slice(0, 8).toUpperCase()} checked in.`
              : `VIP Guest checked in.`,
            url: data.data.reservationId ? `/admin/reservations?detail=${data.data.reservationId}` : undefined,
            relatedId: data.data.reservationId, // This prevents GlobalNotificationToast from double popping
            timestamp: Date.now(),
          },
        })
      );

      // Broadcast to other open Admin tabs
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const channel = new BroadcastChannel("rooma_admin_notifications");
          channel.postMessage({
            type: "CHECK_IN_ALERT",
            title: "Guest Check-In",
            body: `Check-in OK · ${data.data.guestName} (${data.data.tableDisplay})`,
            url: data.data.reservationId ? `/admin/reservations?detail=${data.data.reservationId}` : undefined,
          });
          channel.close();
        } catch {
          // Ignore broadcast error
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      
      // Dispatch error toast locally
      window.dispatchEvent(
        new CustomEvent<NotificationToast>("LOCAL_TOAST_EVENT", {
          detail: {
            id: `local-err-${Date.now()}`,
            type: "error",
            title: "Check-In Failed",
            body: errMsg,
            timestamp: Date.now(),
          },
        })
      );
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

  // This component now acts strictly as an invisible logic controller
  return null;
}
