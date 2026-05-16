"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type PaymentStatusType = "pending" | "paid" | "failed" | "refunded";
type PaymentType = "deposit" | "full";

interface PaymentData {
  orderId: string;
  status: PaymentStatusType;
  type: PaymentType;
  amount?: number;
}

const statusLabelMap: Record<PaymentStatusType, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Pembayaran Berhasil",
  failed: "Pembayaran Gagal",
  refunded: "Pembayaran Dikembalikan",
};

const statusDescMap: Record<PaymentStatusType, string> = {
  pending: "Transaksi sedang diproses. Selesaikan pembayaran di Midtrans.",
  paid: "Pembayaran berhasil. Reservasi sudah dikonfirmasi.",
  failed: "Pembayaran gagal. Silakan ulangi pembayaran.",
  refunded: "Pembayaran telah dikembalikan.",
};

function isValidPaymentStatus(value: string | null): value is PaymentStatusType {
  return (
    value === "pending" ||
    value === "paid" ||
    value === "failed" ||
    value === "refunded"
  );
}

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();

  const orderId = useMemo(() => {
    return searchParams.get("orderId") ?? "";
  }, [searchParams]);

  const statusFromUrl = useMemo<PaymentStatusType>(() => {
    const rawStatus = searchParams.get("status");
    return isValidPaymentStatus(rawStatus) ? rawStatus : "pending";
  }, [searchParams]);

  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<PaymentStatusType>("pending");
  const [paymentType, setPaymentType] = useState<PaymentType>("deposit");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setStatus(statusFromUrl);

    const savedReservationId = localStorage.getItem("reservationId") ?? "";
    setReservationId(savedReservationId);
  }, [statusFromUrl]);

  useEffect(() => {
    if (!isMounted || !orderId) return;

    let cancelled = false;

    async function fetchPaymentStatus() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/public/payments/${orderId}/status`, {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Gagal mengambil status pembayaran.");
        }

        if (data.data) {
          const paymentData: PaymentData = data.data;

          setStatus(paymentData.status);
          setPaymentType(paymentData.type);
          setAmount(paymentData.amount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat mengambil status pembayaran."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPaymentStatus();

    return () => {
      cancelled = true;
    };
  }, [isMounted, orderId]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-slate-600">Memuat status pembayaran...</p>
        </div>
      </div>
    );
  }

  const statusLabel = statusLabelMap[status] ?? "Status Pembayaran";
  const statusDescription =
    statusDescMap[status] ?? "Cek status pembayaran reservasi.";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Status Pembayaran
          </p>

          <h1 className="text-3xl font-semibold">{statusLabel}</h1>

          <p className="text-sm text-slate-600">{statusDescription}</p>
        </header>

        <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 p-6">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Order ID
                </p>
                <p className="mt-2 break-all text-lg font-semibold">
                  {orderId || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold capitalize">
                  {status}
                </p>
              </div>

              {typeof amount === "number" && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Jumlah
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatRupiah(amount)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Tipe Pembayaran
                </p>
                <p className="mt-2 text-lg font-semibold capitalize">
                  {paymentType === "deposit"
                    ? "Deposit 30%"
                    : "Full Payment"}
                </p>
              </div>
            </>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link
            href="/reservasi"
            className="text-xs uppercase tracking-[0.2em] text-slate-500"
          >
            Buat Reservasi Baru
          </Link>

          {status === "pending" && reservationId && (
            <Link
              href={`/reservasi/payment?reservationId=${reservationId}`}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Lanjut ke Pembayaran
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-slate-900">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <p className="text-sm text-slate-600">
              Memuat status pembayaran...
            </p>
          </div>
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}