"use client";

import { useState } from "react";
import Script from "next/script";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle,
  CircleNotch,
  CreditCard,
  FileText,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { payWithSnap } from "@/lib/midtrans-snap-client";

type EventRequestPaymentStatus = "idle" | "creating" | "ready" | "pending" | "paid" | "failed";

export type PublicEventRequestDetail = {
  id: string;
  status: string;
  eventType: string | null;
  eventDate: string;
  partySize: number | null;
  description: string | null;
  guest: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  offer: {
    id: string;
    price: number | null;
    description: string | null;
    documentUrl: string | null;
    status: string;
    createdAt: string;
  } | null;
  payment: {
    id: string;
    type: string | null;
    amount: number | null;
    status: string | null;
    paidAt: string | null;
  } | null;
  canPay: boolean;
};

type EventPaymentResponse = {
  paymentId: string;
  orderId: string;
  token: string;
  redirectUrl: string;
  depositAmount: number;
};

type EventRequestPaymentClientProps = {
  detail: PublicEventRequestDetail;
  accessToken: string;
  snapClientKey: string;
  snapScriptUrl: string;
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function EventRequestPaymentClient({
  detail,
  accessToken,
  snapClientKey,
  snapScriptUrl,
}: EventRequestPaymentClientProps) {
  const [snapReady, setSnapReady] = useState(false);
  const [paymentStatus, setPaymentStatus] =
    useState<EventRequestPaymentStatus>("idle");
  const [paymentResult, setPaymentResult] =
    useState<EventPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const depositEstimate = detail.offer?.price
    ? Math.round(detail.offer.price * 0.3)
    : null;

  const isAlreadyPaid = detail.payment?.status === "paid";
  const canStartPayment = detail.canPay && !isAlreadyPaid && Boolean(snapClientKey);
  const hasOffer = detail.offer !== null;
  const isWaitingForOffer = detail.status === "pending" && !hasOffer;

  function openSnap(token: string) {
    try {
      payWithSnap(token, {
        onSuccess: () => {
          setPaymentStatus("paid");
          setError(null);
        },
        onPending: () => {
          setPaymentStatus("pending");
          setError(null);
        },
        onError: () => {
          setPaymentStatus("failed");
          setError("Pembayaran DP belum berhasil. Silakan coba lagi.");
        },
        onClose: () => {
          setPaymentStatus("ready");
        },
      });
    } catch (requestError) {
      setPaymentStatus("ready");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Midtrans Snap belum siap."
      );
    }
  }

  async function handlePayDeposit() {
    if (paymentResult?.token) {
      openSnap(paymentResult.token);
      return;
    }

    setPaymentStatus("creating");
    setError(null);

    try {
      const response = await fetch(`/api/events/request/${accessToken}/pay`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | { success: true; data: EventPaymentResponse }
        | { success: false; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? "Gagal membuat transaksi DP."
            : payload.error ?? "Gagal membuat transaksi DP."
        );
      }

      setPaymentResult(payload.data);
      setPaymentStatus("ready");

      if (snapReady) {
        openSnap(payload.data.token);
      }
    } catch (requestError) {
      setPaymentStatus("failed");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal membuat transaksi DP."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 pb-12 pt-32 text-slate-900 sm:px-6 lg:px-8">
      {snapClientKey ? (
        <Script
          src={snapScriptUrl}
          strategy="afterInteractive"
          data-client-key={snapClientKey}
          onReady={() => setSnapReady(true)}
          onError={() => {
            setSnapReady(false);
            setError("Gagal memuat Midtrans Snap.");
          }}
        />
      ) : null}

      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            {isWaitingForOffer ? "Event Request" : "Event Payment"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {isWaitingForOffer
              ? "Pengajuan Event Diterima"
              : "Konfirmasi Penawaran Event"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {isWaitingForOffer
              ? "Tim Rooma Ceritarasa akan meninjau kebutuhan acara Anda dan menyiapkan penawaran. Simpan halaman ini untuk memeriksa pembaruan."
              : "Tinjau ringkasan acara dan selesaikan pembayaran DP untuk mengunci jadwal event Anda di Rooma Ceritarasa."}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Request Detail
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {detail.eventType ?? "Special Event"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  PIC: {detail.guest.name} / {detail.guest.phone}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                {detail.status}
              </span>
            </div>

            <div className="mt-6 grid divide-y divide-slate-100 border-y border-slate-100 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="py-4 sm:px-4 sm:first:pl-0">
                <CalendarCheck size={18} className="mb-2 text-primary" />
                <p className="text-slate-500">Tanggal</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatDate(detail.eventDate)}
                </p>
              </div>
              <div className="py-4 sm:px-4">
                <CheckCircle size={18} className="mb-2 text-primary" />
                <p className="text-slate-500">Jumlah Tamu</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {detail.partySize ?? "-"} pax
                </p>
              </div>
              <div className="py-4 sm:px-4 sm:last:pr-0">
                <FileText size={18} className="mb-2 text-primary" />
                <p className="text-slate-500">Request ID</p>
                <p className="mt-1 break-all font-semibold text-slate-950">
                  {detail.id}
                </p>
              </div>
            </div>

            {detail.description ? (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Catatan Acara
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detail.description}
                </p>
              </div>
            ) : null}
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <CreditCard size={20} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {hasOffer ? "Offer Summary" : "Request Progress"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {detail.offer?.price
                    ? formatRupiah(detail.offer.price)
                    : "Menunggu penawaran"}
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-4 border-y border-slate-100 py-5 text-sm">
              {hasOffer ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">DP 30%</span>
                  <span className="font-semibold text-slate-950">
                    {depositEstimate ? formatRupiah(depositEstimate) : "-"}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">
                  {hasOffer ? "Payment" : "Status"}
                </span>
                <span className="font-semibold capitalize text-slate-950">
                  {hasOffer
                    ? paymentStatus === "paid"
                      ? "paid"
                      : detail.payment?.status ?? paymentStatus
                    : detail.status}
                </span>
              </div>
            </div>

            {isWaitingForOffer ? (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-700">
                Pengajuan sedang ditinjau. Setelah penawaran dikirim oleh admin,
                harga, dokumen, dan tombol pembayaran DP akan tampil di halaman
                ini.
              </div>
            ) : null}

            {detail.offer?.description ? (
              <p className="mt-5 text-sm leading-6 text-slate-600">
                {detail.offer.description}
              </p>
            ) : null}

            {detail.offer?.documentUrl ? (
              <a
                href={detail.offer.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Lihat dokumen penawaran
              </a>
            ) : null}

            {error ? (
              <div className="mt-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                <WarningCircle size={18} weight="fill" className="shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            {paymentStatus === "pending" ? (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                Pembayaran sedang menunggu penyelesaian di Midtrans.
              </div>
            ) : null}

            {isAlreadyPaid || paymentStatus === "paid" ? (
              <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                DP event sudah terbayar.
              </div>
            ) : isWaitingForOffer ? null : (
              <button
                type="button"
                onClick={() => void handlePayDeposit()}
                disabled={
                  !canStartPayment ||
                  paymentStatus === "creating" ||
                  (!!paymentResult?.token && !snapReady)
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentStatus === "creating" ? (
                  <CircleNotch size={18} className="animate-spin" />
                ) : (
                  <CreditCard size={18} weight="bold" />
                )}
                {paymentResult?.token ? "Buka Pembayaran" : "Bayar DP Event"}
              </button>
            )}

            {!snapClientKey && !isWaitingForOffer ? (
              <p className="mt-4 text-sm text-red-600">
                Konfigurasi Midtrans belum tersedia.
              </p>
            ) : !canStartPayment && !isAlreadyPaid && !isWaitingForOffer ? (
              <p className="mt-4 text-sm text-slate-500">
                Pembayaran belum tersedia untuk status pengajuan saat ini.
              </p>
            ) : (
              null
            )}
          </aside>
        </section>

        <Link
          href="/event"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} weight="bold" />
          Kembali ke Events
        </Link>
      </div>
    </main>
  );
}
