"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CheckCircle, WarningCircle, Books, ChatTeardropText, Browser, Spinner } from "@phosphor-icons/react";
import type { UpdateRestaurantSettingsInput } from "@/validations/settings.validation";

type AdminSettingsData = Pick<UpdateRestaurantSettingsInput, 'maxGuestsPerDay' | 'depositPercent' | 'cancellationPolicy' | 'confirmationTemplate' | 'reminderTemplate' | 'seoTitle' | 'seoDescription'>;

export default function AdminSettingsClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [formData, setFormData] = useState<AdminSettingsData>({
    maxGuestsPerDay: null,
    depositPercent: null,
    cancellationPolicy: "",
    confirmationTemplate: "",
    reminderTemplate: "",
    seoTitle: "",
    seoDescription: "",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setFormData({
            maxGuestsPerDay: d.maxGuestsPerDay ?? null,
            depositPercent: d.depositPercent ?? null,
            cancellationPolicy: d.cancellationPolicy || "",
            confirmationTemplate: d.confirmationTemplate || "",
            reminderTemplate: d.reminderTemplate || "",
            seoTitle: d.seoTitle || "",
            seoDescription: d.seoDescription || "",
          });
        }
      } catch (e) {
        console.error("Failed to load settings", e);
        setMessage({ text: "Gagal memuat pengaturan. Silakan coba lagi.", type: "error" });
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value ? Number(value) : null) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan pengaturan");
      }
      
      setMessage({ text: "Pengaturan operasional berhasil disimpan!", type: "success" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      setMessage({ text: error.message || "Gagal menyimpan pengaturan", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner className="animate-spin text-4xl text-slate-300" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl pb-20">
      <div className="mb-10">
        <SectionTitle
          eyebrow="Konfigurasi Operasional"
          title="Pengaturan Admin"
          description="Atur aturan reservasi harian, template pesan WhatsApp otomatis, serta optimasi website publik."
        />
      </div>

      {message.text && (
        <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 font-medium text-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Reservation Policy Section */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 text-slate-900 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Books size={24} weight="fill" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Aturan Reservasi</h2>
              <p className="text-xs text-slate-500">Kebijakan booking, kuota harian, dan DP.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Maksimal Tamu Harian</label>
              <div className="relative">
                <input 
                  type="number" 
                  name="maxGuestsPerDay" 
                  min={1}
                  value={formData.maxGuestsPerDay || ""} 
                  onChange={handleChange} 
                  placeholder="Misal: 100" 
                  className="w-full border-2 border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300 rounded-xl" 
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Batas total tamu reservasi dalam satu hari.</p>
            </div>
            
            {/* 
              Kolom Persentase DP & Kebijakan Pembatalan disembunyikan sementara 
              sesuai arahan. Jika diperlukan, silakan dikembalikan ke grid ini. 
            */}
            
          </div>
        </section>

        {/* SEO Settings Section */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 text-slate-900 border-b border-slate-100 pb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Browser size={24} weight="fill" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Optimasi Mesin Pencari (SEO)</h2>
              <p className="text-xs text-slate-500">Tampilan profil website saat dicari di Google.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Judul SEO (Title Tag)</label>
              <input 
                type="text" 
                name="seoTitle" 
                value={formData.seoTitle || ""} 
                onChange={handleChange} 
                placeholder="Misal: Rooma Ceritarasa | Premium Fine Dining" 
                className="w-full border-2 border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300 rounded-xl" 
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Deskripsi SEO (Meta Description)</label>
              <textarea 
                name="seoDescription" 
                rows={3} 
                value={formData.seoDescription || ""} 
                onChange={handleChange} 
                placeholder="Deskripsi singkat yang akan muncul di bawah judul pada halaman pencarian Google..." 
                className="w-full border-2 border-slate-200 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 placeholder:text-slate-300 rounded-xl resize-none"
              ></textarea>
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 sticky bottom-6 z-10">
          <button 
            type="submit" disabled={isSaving}
            className="bg-slate-900 text-white font-bold uppercase tracking-widest py-4 px-10 rounded-xl shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-3 hover:-translate-y-1 hover:shadow-2xl"
          >
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>

      </form>
    </div>
  );
}
