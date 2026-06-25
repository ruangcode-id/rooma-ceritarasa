"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function EventOfferForm({
  eventRequestId,
  onClose,
  onSuccess,
}: {
  eventRequestId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formattedPrice = price
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Number(price))
    : "";

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setPdf(null);
      return;
    }

    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      e.target.value = "";
      setPdf(null);
      setError("File penawaran harus berformat PDF.");
      return;
    }

    setError("");
    setPdf(f);
  }

  function onPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setPrice(digitsOnly.replace(/^0+(?=\d)/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!pdf) {
      setError("File PDF wajib dilampirkan.");
      return;
    }

    const numericPrice = Number(price);
    if (!price || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError("Harga harus berupa angka lebih dari 0.");
      return;
    }

    const fd = new FormData();
    fd.append("pdf", pdf);
    fd.append("price", String(numericPrice));
    if (description) fd.append("description", description);

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/event-requests/${eventRequestId}/offer`, {
        method: "POST",
        body: fd,
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Gagal mengirim penawaran.");
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div>
        <label
          htmlFor="event-offer-pdf"
          className="text-sm font-semibold text-slate-700"
        >
          File Penawaran (PDF)
        </label>
        <input
          id="event-offer-pdf"
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700"
        />
      </div>

      <div>
        <label
          htmlFor="event-offer-price"
          className="text-sm font-semibold text-slate-700"
        >
          Harga (IDR)
        </label>
        <input
          id="event-offer-price"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={price}
          onChange={onPriceChange}
          placeholder="Contoh: 2000000"
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
        />
        {formattedPrice ? (
          <p className="mt-1 text-xs text-slate-500">{formattedPrice}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="event-offer-description"
          className="text-sm font-semibold text-slate-700"
        >
          Deskripsi (opsional)
        </label>
        <textarea
          id="event-offer-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
          rows={4}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner className="size-4 border-white/40 border-t-white" />
              Mengirim...
            </span>
          ) : (
            "Kirim Penawaran"
          )}
        </button>
      </div>
    </form>
  );
}
