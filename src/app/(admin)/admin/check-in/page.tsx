"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  QrCode,
  Keyboard,
  ArrowRight,
} from "@phosphor-icons/react";

export default function AdminCheckInPage() {
  const [mode, setMode] = useState<"manual" | "scan">("scan");
  const [lookupCode, setLookupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const manualInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "idle") return;

    if (mode === "manual") {
      manualInputRef.current?.focus();
      return;
    }

    scanInputRef.current?.focus();
  }, [mode, status]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const handleCheckIn = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setStatus("idle");
    setMessage("");
    setLookupCode("");
    scanBufferRef.current = "";

    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in", lookup: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "Check-in failed. Code is invalid or already used.",
        );
      }

      setStatus("success");
      setMessage(
        `Check-in successful! Reservation ${data.data.reservationId
          .slice(0, 8)
          .toUpperCase()} has been marked as present.`,
      );

      setTimeout(() => {
        setStatus("idle");
        setLookupCode("");
      }, 3500);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));

      setTimeout(() => {
        setStatus("idle");
        setLookupCode("");
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleCheckIn(lookupCode);
  };

  const flushScanBuffer = () => {
    const code = scanBufferRef.current.trim();
    scanBufferRef.current = "";
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (code) void handleCheckIn(code);
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLoading || status !== "idle") {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      flushScanBuffer();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      scanBufferRef.current += e.key;
      setLookupCode(scanBufferRef.current);

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      // Scanner types very fast; if typing pauses, treat as complete scan
      // even when Enter suffix is not configured.
      scanTimeoutRef.current = setTimeout(() => {
        flushScanBuffer();
      }, 120);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col items-center justify-center space-y-8 px-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Front Desk
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">
          Guest Check-In
        </h1>
        <p className="mt-2 text-slate-600">
          Scan the guest QR with the handheld scanner, or type the code manually.
        </p>
      </div>

      <div className="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            setStatus("idle");
            setLookupCode("");
            scanBufferRef.current = "";
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
            mode === "manual"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Keyboard size={20} />
          Manual Input
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("scan");
            setStatus("idle");
            setLookupCode("");
            scanBufferRef.current = "";
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
            mode === "scan"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <QrCode size={20} />
          Scan QR Code
        </button>
      </div>

      <div className="relative flex min-h-[420px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center transition-transform duration-500 ${
            status === "success"
              ? "translate-y-0 bg-green-500 text-white"
              : "translate-y-full"
          } ${status === "idle" ? "hidden" : ""}`}
        >
          <CheckCircle
            size={80}
            weight="fill"
            className="mb-4 animate-bounce text-green-100"
          />
          <h2 className="mb-2 text-3xl font-bold">Check-in Successful!</h2>
          <p className="text-lg text-green-50">{message}</p>
        </div>

        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center transition-transform duration-500 ${
            status === "error"
              ? "translate-y-0 bg-red-500 text-white"
              : "translate-y-full"
          } ${status === "idle" ? "hidden" : ""}`}
        >
          <XCircle
            size={80}
            weight="fill"
            className="mb-4 animate-pulse text-red-100"
          />
          <h2 className="mb-2 text-3xl font-bold">Check-in Failed</h2>
          <p className="text-lg text-red-50">{message}</p>
        </div>

        {mode === "manual" && status === "idle" && (
          <form
            onSubmit={handleManualSubmit}
            className="flex w-full max-w-sm flex-col items-center"
          >
            <label className="mb-4 block w-full text-center text-sm font-semibold text-slate-700">
              Enter Reservation Code or ID:
            </label>
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Example: a1b2c3d4"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-6 py-5 text-center text-3xl font-bold tracking-widest text-slate-900 uppercase transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/20"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!lookupCode || isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-primary/90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Confirm Attendance"}
              {!isLoading && <ArrowRight weight="bold" />}
            </button>
          </form>
        )}

        {mode === "scan" && status === "idle" && (
          <div className="flex w-full flex-col items-center text-center">
            {/* Hidden capture field for iware keyboard-wedge scanner */}
            <input
              ref={scanInputRef}
              type="text"
              value=""
              onChange={() => undefined}
              onKeyDown={handleScanKeyDown}
              onBlur={() => {
                if (status === "idle" && !isLoading) {
                  scanInputRef.current?.focus();
                }
              }}
              className="pointer-events-none absolute h-px w-px opacity-0"
              autoComplete="off"
              autoFocus
              aria-label="Scanner input"
              disabled={isLoading}
            />

            <button
              type="button"
              onClick={() => scanInputRef.current?.focus()}
              className="relative mb-6 flex h-48 w-48 flex-col items-center justify-center rounded-3xl border-4 border-dashed border-primary/40 bg-slate-50 transition-colors hover:border-primary/70"
            >
              <QrCode size={64} className="text-primary/70" />
              <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 animate-[pulse_2s_ease-in-out_infinite] bg-primary/50" />
            </button>

            <h3 className="text-lg font-semibold text-slate-900">
              {isLoading ? "Processing…" : "Ready for handheld scanner"}
            </h3>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
              Point the iware scanner at the guest QR on their phone. The code
              will check in automatically — no laptop camera needed.
            </p>
            {lookupCode ? (
              <p className="mt-4 font-mono text-sm tracking-wider text-slate-700">
                Reading: {lookupCode}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
