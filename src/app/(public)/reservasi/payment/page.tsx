"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPayment } from "@/lib/api/payment";

const DEPOSIT_AMOUNT = 150000;
const FULL_AMOUNT = 500000;

type PaymentType = "deposit" | "full";

type SnapResult = {
  order_id?: string;
  transaction_status?: string;
  status_code?: string;
  status_message?: string;
  payment_type?: string;
};

type SnapOptions = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapOptions) => void;
    };
  }
}

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function PaymentStepContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reservationId = useMemo(() => {
    return searchParams.get("reservationId") ?? "";
  }, [searchParams]);

  const [selectedType, setSelectedType] = useState<PaymentType>("deposit");
  const [isLoading, setIsLoading] = useState(false);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.snap) {
      setSnapLoaded(true);
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

    if (!clientKey) {
      setError("Midtrans client key belum tersedia di .env.local.");
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]'
    );

    if (existingScript) {
      if (window.snap) {
        setSnapLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setSnapLoaded(true));
        existingScript.addEventListener("error", () =>
          setError("Gagal memuat halaman pembayaran Midtrans.")
        );
      }

      return;
    }

    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.async = true;

    script.onload = () => {
      setSnapLoaded(true);
    };

    script.onerror = () => {
      setError("Gagal memuat halaman pembayaran Midtrans.");
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  async function handleContinue() {
    if (!reservationId) {
      setError("Reservasi tidak ditemukan. Silakan kembali ke form reservasi.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amount =
        selectedType === "deposit" ? DEPOSIT_AMOUNT : FULL_AMOUNT;

      const guestName =
        typeof window !== "undefined"
          ? localStorage.getItem("guestName") ?? "Guest"
          : "Guest";

      const result = await createPayment({
        reservationId,
        paymentType: selectedType,
        amount,
        customer: {
          name: guestName,
        },
        items: [
          {
            id: selectedType,
            name:
              selectedType === "deposit"
                ? "Deposit Reservasi 30%"
                : "Full Payment Reservasi",
            price: amount,
            quantity: 1,
          },
        ],
      });

      if (!result?.token || !result?.orderId) {
        throw new Error("Token pembayaran tidak ditemukan dari server.");
      }

      if (!window.snap) {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
          return;
        }

        throw new Error("Midtrans Snap belum siap. Coba refresh halaman.");
      }

      window.snap.pay(result.token, {
        onSuccess: () => {
          router.push(
            `/reservasi/payment/status?orderId=${result.orderId}&status=paid`
          );
        },
        onPending: () => {
          router.push(
            `/reservasi/payment/status?orderId=${result.orderId}&status=pending`
          );
        },
        onError: () => {
          router.push(
            `/reservasi/payment/status?orderId=${result.orderId}&status=failed`
          );
        },
        onClose: () => {
          setError("Popup pembayaran ditutup sebelum pembayaran selesai.");
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memulai pembayaran. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const selectedAmount =
    selectedType === "deposit" ? DEPOSIT_AMOUNT : FULL_AMOUNT;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Pembayaran
          </p>
          <h1 className="text-3xl font-semibold">Pilih Pembayaran</h1>
          <p className="text-sm text-slate-600">
            Pilih jenis pembayaran untuk reservasi ini.
          </p>
        </header>

        <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 p-6">
          {!reservationId && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              Reservasi tidak ditemukan. Silakan kembali ke form reservasi.
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {reservationId && (
            <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
              ID Reservasi:{" "}
              <span className="font-semibold text-slate-900">
                {reservationId}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSelectedType("deposit")}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
              selectedType === "deposit"
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <span className="font-semibold">Deposit 30%</span>
            <span className="text-slate-700">
              {formatRupiah(DEPOSIT_AMOUNT)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("full")}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
              selectedType === "full"
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <span className="font-semibold">Full Payment</span>
            <span className="text-slate-700">{formatRupiah(FULL_AMOUNT)}</span>
          </button>

          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total pembayaran</span>
              <span className="font-semibold">
                {formatRupiah(selectedAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <a
              href="/reservasi"
              className="text-xs uppercase tracking-[0.2em] text-slate-500"
            >
              Kembali
            </a>

            <button
              type="button"
              onClick={handleContinue}
              disabled={isLoading || !snapLoaded || !reservationId}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Memproses..."
                : !snapLoaded
                  ? "Memuat Midtrans..."
                  : "Lanjut ke Pembayaran"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PaymentStepPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-6 py-12 text-slate-900">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm text-slate-600">Memuat pembayaran...</p>
          </div>
        </div>
      }
    >
      <PaymentStepContent />
    </Suspense>
  );
}