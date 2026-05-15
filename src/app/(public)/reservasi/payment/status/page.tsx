import Link from "next/link";

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; orderId?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "pending";
  const orderId = params.orderId ?? "ROOMA-XXXX";

  const statusLabelMap: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    paid: "Pembayaran Berhasil",
    failed: "Pembayaran Gagal",
  };

  const statusDescMap: Record<string, string> = {
    pending: "Transaksi sedang diproses. Selesaikan pembayaran di Midtrans.",
    paid: "Pembayaran berhasil. Reservasi sudah dikonfirmasi.",
    failed: "Pembayaran gagal. Silakan ulangi pembayaran.",
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Status Pembayaran
          </p>
          <h1 className="text-3xl font-semibold">
            {statusLabelMap[status] ?? "Status Pembayaran"}
          </h1>
          <p className="text-sm text-slate-600">
            {statusDescMap[status] ?? "Cek status pembayaran reservasi."}
          </p>
        </header>

        <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Order ID</p>
            <p className="mt-2 text-lg font-semibold">{orderId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
            <p className="mt-2 text-lg font-semibold">{status}</p>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link
            href="/reservasi"
            className="text-xs uppercase tracking-[0.2em] text-slate-500"
          >
            Buat Reservasi Baru
          </Link>
          <Link
            href="/reservasi/payment"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Lihat Pembayaran
          </Link>
        </div>
      </div>
    </div>
  );
}
