"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Receipt,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  createPayment,
  getPaymentStatus,
  type CreatePaymentResponse,
  type PaymentStatusResponse,
} from "@/lib/api/payment";
import { ReservationPaymentType } from "@/features/payments/payment.types";

type PaymentCheckoutFormProps = {
  initialReservationId?: string;
  initialOrderId?: string;
  initialTransactionStatus?: string;
  initialStatusCode?: string;
};

const statusCopy: Record<PaymentStatusResponse["status"], string> = {
  pending: "Menunggu pembayaran",
  paid: "Pembayaran berhasil",
  failed: "Pembayaran gagal",
  refunded: "Dana dikembalikan",
};

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function parseAmount(amount: PaymentStatusResponse["amount"]) {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") return Number(amount);
  return 0;
}

function getMidtransReturnMessage(transactionStatus: string, statusCode: string) {
  const normalizedStatus = transactionStatus.toLowerCase();

  if (!normalizedStatus && !statusCode) return "";

  if (normalizedStatus === "settlement" || normalizedStatus === "capture") {
    return "Midtrans mengirim sinyal pembayaran berhasil. Status final tetap mengikuti webhook dan pengecekan order di bawah.";
  }

  if (normalizedStatus === "pending") {
    return "Pembayaran masih pending di Midtrans. Selesaikan instruksi pembayaran, lalu cek ulang status transaksi.";
  }

  if (
    normalizedStatus === "deny" ||
    normalizedStatus === "cancel" ||
    normalizedStatus === "expire" ||
    normalizedStatus === "failure"
  ) {
    return "Midtrans mengirim sinyal pembayaran gagal atau kedaluwarsa. Anda dapat membuat pembayaran baru bila reservasi masih tersedia.";
  }

  return `Return Midtrans diterima${
    statusCode ? ` dengan status code ${statusCode}` : ""
  }. Cek status order untuk hasil terbaru.`;
}

function PaymentStatusBadge({ status }: { status: PaymentStatusResponse["status"] }) {
  const style =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "failed"
        ? "bg-red-50 text-red-700 ring-red-200"
        : status === "refunded"
          ? "bg-blue-50 text-blue-700 ring-blue-200"
          : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style}`}>
      {statusCopy[status]}
    </span>
  );
}

export default function PaymentCheckoutForm({
  initialReservationId = "",
  initialOrderId = "",
  initialTransactionStatus = "",
  initialStatusCode = "",
}: PaymentCheckoutFormProps) {
  const [reservationId, setReservationId] = useState(initialReservationId);
  const [paymentType, setPaymentType] = useState<ReservationPaymentType>(
    ReservationPaymentType.Deposit
  );
  const [orderId, setOrderId] = useState(initialOrderId);
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  const canPay = useMemo(() => reservationId.trim().length > 0, [reservationId]);
  const midtransReturnMessage = useMemo(
    () => getMidtransReturnMessage(initialTransactionStatus, initialStatusCode),
    [initialStatusCode, initialTransactionStatus]
  );
  const statusAmount = parseAmount(paymentStatus?.amount);

  async function refreshStatus(nextOrderId = orderId) {
    if (!nextOrderId.trim()) return;

    setIsChecking(true);
    setError("");

    try {
      const nextStatus = await getPaymentStatus(nextOrderId.trim());
      setPaymentStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengecek status pembayaran.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPay) {
      setError("Masukkan kode reservasi terlebih dahulu.");
      return;
    }

    setIsCreating(true);
    setError("");
    setPayment(null);
    setPaymentStatus(null);

    try {
      const result = await createPayment({
        reservationId: reservationId.trim(),
        paymentType,
      });

      setPayment(result);

      if (result.orderId) {
        setOrderId(result.orderId);
      }

      if (!result.paymentRequired) {
        return;
      }

      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pembayaran.");
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    if (initialOrderId) {
      const timer = window.setTimeout(() => {
        void refreshStatus(initialOrderId);
      }, 0);

      return () => window.clearTimeout(timer);
    }
    // initialOrderId should only trigger the first status check on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="border border-essence-line bg-essence-paper p-4 text-essence-ink shadow-sm sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-essence-label text-xs font-bold text-essence-gold">
              Secure payment
            </p>
            <h1 className="font-essence-serif mt-5 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              {initialOrderId ? "Review your payment." : "Finalize your table."}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-essence-muted sm:text-lg">
              {initialOrderId
                ? "Kami menerima return dari Midtrans. Gunakan panel status untuk memastikan webhook sudah memperbarui pembayaran dan reservasi."
                : "Masukkan kode reservasi, lalu lanjutkan pembayaran melalui Midtrans. Status akan tersinkron otomatis dari webhook setelah transaksi selesai."}
            </p>
          </div>
          <div className="hidden border border-essence-ink p-3 text-essence-ink sm:block">
            <CreditCard size={28} weight="duotone" />
          </div>
        </div>

        {midtransReturnMessage && (
          <div className="mb-5 border border-essence-gold/40 bg-[#f1eadb] p-4 text-sm leading-6 text-essence-muted">
            <p className="font-essence-label mb-2 text-xs font-bold text-essence-gold">
              Midtrans return
            </p>
            {midtransReturnMessage}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="font-essence-label block text-xs font-bold text-essence-muted">
            Kode reservasi
            <input
              className="font-essence-serif mt-4 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-xl normal-case tracking-normal text-essence-ink outline-none placeholder:text-essence-line focus:border-essence-gold sm:mt-5 sm:px-4 sm:text-2xl"
              placeholder="contoh: 8f9d2..."
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
            />
          </label>

          <div>
            <p className="font-essence-label text-xs font-bold text-essence-muted">
              Jenis pembayaran
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[
                ["Deposit", ReservationPaymentType.Deposit, "Bayar deposit sesuai jumlah tamu."],
                ["Full payment", ReservationPaymentType.Full, "Gunakan saat ingin menandai penuh."],
              ].map(([label, value, description]) => (
                <label
                  key={value}
                  className={`rounded-2xl border p-4 text-sm transition ${
                    paymentType === value
                      ? "border-essence-gold bg-[#f1eadb]"
                      : "border-essence-line bg-essence-paper"
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="paymentType"
                    value={value}
                    checked={paymentType === value}
                    onChange={() => setPaymentType(value as ReservationPaymentType)}
                  />
                  <span className="font-essence-serif text-xl text-essence-ink">{label}</span>
                  <span className="mt-2 block text-sm leading-5 text-essence-muted">
                    {description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              <WarningCircle className="mt-0.5 shrink-0" size={20} weight="fill" />
              <span>{error}</span>
            </div>
          )}

          {payment && (
            <div className="border border-essence-line bg-essence-ivory p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 shrink-0 text-emerald-600" size={22} weight="fill" />
                <div>
                  <p className="font-essence-serif text-xl text-essence-ink">
                    {payment.paymentRequired
                      ? "Invoice pembayaran sudah dibuat"
                      : "Reservasi tidak memerlukan deposit"}
                  </p>
                  <p className="mt-1 text-sm text-essence-muted">
                    {payment.message ??
                      `Nominal pembayaran: ${formatRupiah(payment.amount)} untuk ${payment.partySize} tamu.`}
                  </p>
                  {payment.redirectUrl && (
                    <a
                      className="font-essence-label mt-4 inline-flex border border-essence-ink px-4 py-2 text-[10px] font-bold text-essence-ink transition hover:bg-essence-ink hover:text-white"
                      href={payment.redirectUrl}
                    >
                      Buka Midtrans
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating || !canPay}
            className="font-essence-label w-full bg-essence-gold px-5 py-4 text-xs font-bold text-white transition hover:bg-[#30322e] disabled:cursor-not-allowed disabled:bg-black/20 sm:py-5"
          >
            {isCreating ? "Menyiapkan pembayaran..." : "Lanjut ke pembayaran"}
          </button>
        </form>
      </section>

      <aside className="space-y-5">
        <section className="border border-essence-line bg-essence-paper p-4 text-essence-ink shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="border border-essence-line p-3">
              <Receipt size={24} weight="duotone" />
            </div>
            <div>
              <p className="font-essence-label text-xs font-bold text-essence-gold">
                Payment status
              </p>
              <h2 className="font-essence-serif text-xl sm:text-2xl">Cek transaksi</h2>
            </div>
          </div>

          <label className="font-essence-label mt-5 block text-xs font-bold text-essence-muted">
            Order ID Midtrans
            <input
              className="font-essence-serif mt-3 w-full border-0 border-b border-essence-line bg-transparent px-3 py-4 text-lg normal-case tracking-normal text-essence-ink outline-none focus:border-essence-gold sm:px-4 sm:text-xl"
              placeholder="ROOMA-..."
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => refreshStatus()}
            disabled={isChecking || !orderId.trim()}
            className="font-essence-label mt-5 w-full border border-essence-ink px-5 py-4 text-xs font-bold text-essence-ink transition hover:bg-essence-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? "Mengecek..." : "Cek status"}
          </button>

          {paymentStatus && (
            <div className="mt-4 border border-essence-line bg-essence-ivory p-4 text-essence-ink">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold">{paymentStatus.orderId}</p>
                <PaymentStatusBadge status={paymentStatus.status} />
              </div>
              <p className="font-essence-serif mt-3 text-2xl sm:text-3xl">
                {formatRupiah(Number.isFinite(statusAmount) ? statusAmount : 0)}
              </p>
              <p className="mt-1 text-sm capitalize text-essence-muted">{paymentStatus.type}</p>
              {paymentStatus.status === "paid" && (
                <p className="mt-3 text-sm leading-6 text-emerald-700">
                  Pembayaran sudah paid. Webhook Midtrans akan mengonfirmasi reservasi dan menghapus masa kedaluwarsa reservasi.
                </p>
              )}
              {paymentStatus.status === "pending" && (
                <p className="mt-3 text-sm leading-6 text-amber-700">
                  Pembayaran masih pending. Jika baru selesai membayar, tunggu beberapa detik lalu cek ulang.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="border border-essence-line bg-essence-paper p-4 text-essence-ink shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <Clock className="mt-1 shrink-0 text-essence-gold" size={22} weight="fill" />
            <div>
              <h2 className="font-essence-serif text-2xl">Aturan deposit</h2>
              <div className="mt-4 space-y-3 text-sm text-essence-muted">
                <p>1-2 tamu: tanpa deposit.</p>
                <p>3-4 tamu: deposit Rp 150.000.</p>
                <p>5+ tamu: deposit Rp 300.000.</p>
                <p>10+ tamu: minimum order Rp 1.000.000 saat kunjungan.</p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
