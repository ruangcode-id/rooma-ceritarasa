"use client";

import { useState } from "react";

export default function EventOfferForm({
  eventRequestId,
  onClose,
  onSuccess,
}: {
  eventRequestId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (f) setPdf(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!pdf) {
      setError("File PDF wajib dilampirkan.");
      return;
    }

    if (!price || Number.isNaN(price) || price <= 0) {
      setError("Harga harus berupa angka lebih dari 0.");
      return;
    }

    const fd = new FormData();
    fd.append("pdf", pdf);
    fd.append("price", String(price));
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
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div>
        <label className="text-sm font-semibold">File Penawaran (PDF)</label>
        <input type="file" accept="application/pdf" onChange={onFileChange} className="mt-2" />
      </div>

      <div>
        <label className="text-sm font-semibold">Harga (IDR)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Deskripsi (opsional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={4}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          Batal
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
          {isSubmitting ? "Mengirim..." : "Kirim Penawaran"}
        </button>
      </div>
    </form>
  );
}
