import Link from "next/link";

export default function PaymentStepPage() {
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
          {[
            { title: "Deposit 30%", price: "Rp 150.000" },
            { title: "Full Payment", price: "Rp 500.000" },
          ].map((option) => (
            <label
              key={option.title}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <span className="font-semibold">{option.title}</span>
              <span className="text-slate-700">{option.price}</span>
            </label>
          ))}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Link
              href="/reservasi"
              className="text-xs uppercase tracking-[0.2em] text-slate-500"
            >
              Kembali
            </Link>
            <Link
              href="/reservasi/payment/status?status=pending"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Lanjut ke Status
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
