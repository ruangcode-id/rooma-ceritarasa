"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, XCircle, QrCode, Keyboard, ArrowRight } from "@phosphor-icons/react";

export default function AdminCheckInPage() {
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [lookupCode, setLookupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "manual" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode, status]);

  const handleCheckIn = async (code: string) => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in", lookup: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Gagal check-in. Kode tidak valid atau sudah digunakan.");
      }

      setStatus("success");
      setMessage(`Check-in berhasil! Reservasi ${data.data.reservationId.slice(0, 8).toUpperCase()} telah ditandai hadir.`);
      
      // Auto reset after 3.5 seconds
      setTimeout(() => {
        setStatus("idle");
        setLookupCode("");
        if (inputRef.current) inputRef.current.focus();
      }, 3500);

    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
      
      // Auto reset error after 4 seconds
      setTimeout(() => {
        setStatus("idle");
        setLookupCode("");
        if (inputRef.current) inputRef.current.focus();
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleCheckIn(lookupCode);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center space-y-8 max-w-2xl mx-auto px-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Front Desk</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">Guest Check-In</h1>
        <p className="mt-2 text-slate-600">Pindai QR tamu atau masukkan kode reservasi secara manual.</p>
      </div>

      <div className="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
        <button
          onClick={() => setMode("manual")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
            mode === "manual" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Keyboard size={20} />
          Input Manual
        </button>
        <button
          onClick={() => {
            setMode("scan");
            setStatus("idle");
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
            mode === "scan" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <QrCode size={20} />
          Scan QR Code
        </button>
      </div>

      <div className="w-full relative min-h-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center overflow-hidden">
        
        {/* State Overlays */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-transform duration-500 z-10 ${status === "success" ? "translate-y-0 bg-green-500 text-white" : "translate-y-full"} ${status === "idle" ? "hidden" : ""}`}>
          <CheckCircle size={80} weight="fill" className="mb-4 text-green-100 animate-bounce" />
          <h2 className="text-3xl font-bold mb-2">Check-in Berhasil!</h2>
          <p className="text-green-50 text-lg">{message}</p>
        </div>

        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-transform duration-500 z-10 ${status === "error" ? "translate-y-0 bg-red-500 text-white" : "translate-y-full"} ${status === "idle" ? "hidden" : ""}`}>
          <XCircle size={80} weight="fill" className="mb-4 text-red-100 animate-pulse" />
          <h2 className="text-3xl font-bold mb-2">Check-in Gagal</h2>
          <p className="text-red-50 text-lg">{message}</p>
        </div>

        {/* Normal Content */}
        {mode === "manual" && status === "idle" && (
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center max-w-sm">
            <label className="text-sm font-semibold text-slate-700 mb-4 block w-full text-center">
              Masukkan Kode atau ID Reservasi:
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Contoh: a1b2c3d4"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-6 py-5 text-center text-3xl font-bold tracking-widest text-slate-900 uppercase focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!lookupCode || isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-primary/30"
            >
              {isLoading ? "Memproses..." : "Konfirmasi Hadir"}
              {!isLoading && <ArrowRight weight="bold" />}
            </button>
          </form>
        )}

        {mode === "scan" && status === "idle" && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="relative w-48 h-48 border-4 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center bg-slate-50 mb-6 group hover:border-primary/50 transition-colors">
              <QrCode size={64} className="text-slate-300 group-hover:text-primary/50 transition-colors" />
              <div className="absolute inset-x-6 top-1/2 h-0.5 bg-primary/40 shadow-[0_0_8px_rgba(255,255,255,0.8)] -translate-y-1/2 animate-[pulse_2s_ease-in-out_infinite]" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">Scanner Aktif</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs leading-relaxed">
              Fitur akses kamera untuk <span className="italic">scan</span> otomatis sedang dalam tahap simulasi.
              Gunakan mode Input Manual.
            </p>
            <button 
              onClick={() => setMode("manual")}
              className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Kembali ke Input Manual
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
