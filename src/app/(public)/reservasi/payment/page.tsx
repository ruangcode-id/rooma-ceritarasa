"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPayment, type CreatePaymentResponse } from "@/lib/api/payment";
import { ReservationPaymentType } from "@/features/payments/payment.types";

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

function getMidtransSnapUrl() {
  const isProduction =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

function PaymentStepContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reservationId = useMemo(() => {
    return searchParams.get("reservationId") ?? "";
  }, [searchParams]);

  const [paymentResult, setPaymentResult] =
    useState<CreatePaymentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function ensureSnapReady() {
    if (window.snap) {
      setSnapLoaded(true);
      return true;
    }

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

    if (!clientKey) {
      setError("Midtrans client key belum tersedia di .env.local.");
      return false;
    }

    const snapUrl = getMidtransSnapUrl();

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${snapUrl}"]`
    );

    if (existingScript) {
      if (window.snap) {
        setSnapLoaded(true);
        return true;
      }

      return new Promise<boolean>((resolve) => {
        const handleLoad = () => {
          setSnapLoaded(true);
          existingScript.removeEventListener("load", handleLoad);
          existingScript.removeEventListener("error", handleError);
          resolve(true);
        };

        const handleError = () => {
          setError("Gagal memuat halaman pembayaran Midtrans.");
          existingScript.removeEventListener("load", handleLoad);
          existingScript.removeEventListener("error", handleError);
          resolve(false);
        };

        existingScript.addEventListener("load", handleLoad);
        existingScript.addEventListener("error", handleError);
      });
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");

      script.src = snapUrl;
      script.setAttribute("data-client-key", clientKey);
      script.async = true;

      script.onload = () => {
        setSnapLoaded(true);
        resolve(true);
      };

      script.onerror = () => {
        setError("Gagal memuat halaman pembayaran Midtrans.");
        resolve(false);
      };

      document.body.appendChild(script);
    });
  }

  async function handleContinue() {
    if (!reservationId) {
      setError("Reservasi tidak ditemukan. Silakan kembali ke form reservasi.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await createPayment({
        reservationId,
        paymentType: ReservationPaymentType.Deposit,
      });

      setPaymentResult(result);

      if (!result.paymentRequired) {
        setSuccessMessage(
          result.message ??
            "Reservasi berhasil dibuat tanpa deposit. Reservasi sudah dikonfirmasi."
        );
        return;
      }

      if (!result.token || !result.orderId) {
        throw new Error("Token pembayaran tidak ditemukan dari server.");
      }

      const snapReady = await ensureSnapReady();

      if (!snapReady || !window.snap) {
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

  const selectedAmount = paymentResult?.amount ?? null;
  const depositPolicy = paymentResult?.depositPolicy ?? null;
  const minimumOrder = paymentResult?.minimumOrder ?? null;
  const paymentRequired = paymentResult?.paymentRequired ?? null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Pembayaran
          </p>
          <h1 className="text-3xl font-semibold">Pembayaran Reservasi</h1>
          <p className="text-sm text-slate-600">
            Sistem akan menghitung kebutuhan deposit berdasarkan jumlah tamu.
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

          {successMessage && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
              {successMessage}
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

          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Kebijakan Deposit
            </p>

            {depositPolicy ? (
              <div className="mt-3 space-y-1 text-slate-600">
                <p>
                  1-{depositPolicy.noDepositMaxGuests} tamu: tanpa deposit.
                </p>
                <p>
                  3-4 tamu: deposit{" "}
                  {formatRupiah(depositPolicy.depositForThreeToFourGuests)}.
                </p>
                <p>
                  5+ tamu: deposit{" "}
                  {formatRupiah(depositPolicy.depositForFivePlusGuests)}.
                </p>
                <p>
                  10+ tamu: minimum order{" "}
                  {formatRupiah(depositPolicy.minimumOrderForTenPlusGuests)}.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-1 text-slate-600">
                <p>1-2 tamu: tanpa deposit.</p>
                <p>3-4 tamu: deposit Rp150.000.</p>
                <p>5+ tamu: deposit Rp300.000.</p>
                <p>10+ tamu: minimum order Rp1.000.000.</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total pembayaran</span>
              <span className="font-semibold">
                {selectedAmount !== null ? formatRupiah(selectedAmount) : "-"}
              </span>
            </div>
          </div>

          {typeof minimumOrder === "number" && minimumOrder > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Minimum order untuk reservasi 10+ tamu sebesar{" "}
              {formatRupiah(minimumOrder)}.
            </div>
          )}

          {paymentRequired === false && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Reservasi ini tidak membutuhkan pembayaran deposit. Status
              reservasi sudah dikonfirmasi.
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <a
              href="/reservasi"
              className="text-xs uppercase tracking-[0.2em] text-slate-500"
            >
              Kembali
            </a>

            {paymentRequired === false ? (
              <a
                href="/reservasi"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              >
                Buat Reservasi Baru
              </a>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={isLoading || !reservationId}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Memproses..."
                  : snapLoaded
                    ? "Lanjut ke Pembayaran"
                    : "Cek Deposit & Lanjutkan"}
              </button>
            )}
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