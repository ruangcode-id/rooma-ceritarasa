import { SectionTitle } from "@/components/ui/SectionTitle";

export function ReservationFormPreview() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle eyebrow="Inputs" title="Reservation form surface" />
      <form className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-semibold text-slate-700">
            Nama tamu
          </label>
          <input
            id="name"
            type="text"
            defaultValue="Nadia Prameswari"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="text-sm font-semibold text-slate-700"
          >
            WhatsApp
          </label>
          <input
            id="phone"
            type="tel"
            defaultValue="+62 857 2553 9262"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label
            htmlFor="session"
            className="text-sm font-semibold text-slate-700"
          >
            Sesi
          </label>
          <select
            id="session"
            defaultValue="17.30 - 19.30"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          >
            <option>15.00 - 17.00</option>
            <option>17.30 - 19.30</option>
            <option>20.00 - 22.00</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="deposit"
            className="text-sm font-semibold text-slate-700"
          >
            Deposit
          </label>
          <div className="mt-2 flex rounded-lg border border-slate-200 bg-white focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
            <span className="grid w-14 place-items-center border-r border-slate-200 text-sm font-semibold text-slate-500">
              Rp
            </span>
            <input
              id="deposit"
              type="number"
              defaultValue="150000"
              className="w-full rounded-r-lg px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          <label
            htmlFor="notes"
            className="text-sm font-semibold text-slate-700"
          >
            Catatan
          </label>
          <textarea
            id="notes"
            rows={4}
            defaultValue="Window seat jika tersedia."
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </form>
    </section>
  );
}
