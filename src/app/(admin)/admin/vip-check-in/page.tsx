"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  QrCode,
  Keyboard,
  ArrowRight,
  Crown,
} from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

export default function AdminVipCheckInPage() {
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
      if (!res.ok) {
        throw new Error(await handleApiError(res));
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(
          data.error ?? "Check-in failed. Code is invalid or already used.",
        );
      }

      setStatus("success");
      setMessage(
        `Welcome back, ${data.data.guestName}! Direct guest to VIP Area / Private Room.`,
      );

      setTimeout(() => {
        setStatus("idle");
        setLookupCode("");
      }, 4000);
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
      e.stopPropagation();
      flushScanBuffer();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.stopPropagation();
      scanBufferRef.current += e.key;
      setLookupCode(scanBufferRef.current);

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        flushScanBuffer();
      }, 120);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col items-center justify-start space-y-6 px-4 py-8 lg:justify-center lg:py-0 lg:space-y-8">
      <div className="w-full">
        <div className="flex items-center gap-1.5">
          <Crown size={12} weight="fill" className="text-amber-500" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">
            VIP Operations
          </p>
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">VIP Check-In</h1>
        <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Scan the VIP digital card QR with the handheld scanner, or type the VIP code manually.
        </div>
      </div>

      <div className="flex w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            setStatus("idle");
            setLookupCode("");
            scanBufferRef.current = "";
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
            mode === "manual"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 hover:bg-amber-50/50"
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
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
            mode === "scan"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 hover:bg-amber-50/50"
          }`}
        >
          <QrCode size={20} />
          Scan QR Code
        </button>
      </div>

      <div className="relative flex min-h-[420px] w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm lg:p-8">
        {/* Success Banner (Gold/Amber Theme) */}
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center transition-transform duration-500 ${
            status === "success"
              ? "translate-y-0 bg-amber-500 text-white"
              : "translate-y-full"
          } ${status === "idle" ? "hidden" : ""}`}
        >
          <CheckCircle
            size={80}
            weight="fill"
            className="mb-4 animate-bounce text-amber-100"
          />
          <h2 className="mb-2 text-3xl font-bold">VIP Check-in Successful!</h2>
          <p className="text-lg text-amber-50">{message}</p>
        </div>

        {/* Error Banner */}
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center transition-transform duration-500 ${
            status === "error"
              ? "translate-y-0 bg-red-600 text-white"
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

        {/* Manual Input Form */}
        {mode === "manual" && status === "idle" && (
          <form
            onSubmit={handleManualSubmit}
            className="flex w-full max-w-sm flex-col items-center"
          >
            <label className="mb-4 block w-full text-center text-sm font-semibold text-slate-700">
              Enter VIP Code / Token:
            </label>
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Example: ae994205..."
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 bg-amber-50/30 px-6 py-5 text-center text-2xl font-bold tracking-widest text-slate-900 uppercase transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/20"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!lookupCode || isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-8 py-4 font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Processing..." : "Confirm VIP Attendance"}
              {!isLoading && <ArrowRight weight="bold" />}
            </button>
          </form>
        )}

        {/* Scan Mode Box */}
        {mode === "scan" && status === "idle" && (
          <div className="flex w-full flex-col items-center text-center">
            <input
              ref={scanInputRef}
              type="text"
              autoFocus
              className="absolute h-0 w-0 opacity-0"
              onKeyDown={handleScanKeyDown}
              onBlur={() => {
                if (status === "idle" && mode === "scan" && !isLoading) {
                  setTimeout(() => scanInputRef.current?.focus(), 100);
                }
              }}
            />

            <button
              type="button"
              onClick={() => scanInputRef.current?.focus()}
              className="relative mb-6 flex h-48 w-48 flex-col items-center justify-center rounded-3xl border-4 border-dashed border-amber-500/40 bg-amber-50/40 transition-colors hover:border-amber-500/70"
            >
              <Crown size={36} weight="fill" className="absolute top-4 text-amber-400/60" />
              <QrCode size={64} className="text-amber-500/70" />
              <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 animate-[pulse_2s_ease-in-out_infinite] bg-amber-500/50" />
            </button>

            <h3 className="text-lg font-semibold text-slate-900">
              {isLoading ? "Processing…" : "Ready for VIP Scanner Input"}
            </h3>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
              Point the handheld scanner at the VIP Digital Card QR code. The system
              will automatically process attendance upon scan.
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
