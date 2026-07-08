"use client";

import { useEffect, useState } from "react";
import { Clock, Storefront, Phone, Users, CheckCircle, WarningCircle } from "@phosphor-icons/react";

type OperatingHours = {
  [day: string]: { open?: string; close?: string; closed?: boolean };
};

type SettingsData = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  socialLinks: Record<string, string>;
};

const DAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export default function OwnerSettingsClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [formData, setFormData] = useState<SettingsData>({
    name: "",
    tagline: "",
    address: "",
    phone: "",
    whatsappNumber: "",
    socialLinks: { instagram: "" },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setFormData({
            name: d.name || "",
            tagline: d.tagline || "",
            address: d.address || "",
            phone: d.phone || "",
            whatsappNumber: d.whatsappNumber || "",
            socialLinks: d.socialLinks || { instagram: "" },
          });
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialLinkChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const payload = { ...formData };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save settings");
      
      setMessage({ text: "Settings saved successfully!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400 font-medium">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Owner Configuration</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Master Settings</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl">
          Global settings for restaurant profile and official contacts.
        </p>
      </header>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-medium text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info Section */}
        <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <Storefront size={24} weight="fill" className="text-primary" />
            <h2 className="text-lg font-bold">Restaurant Profile</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Restaurant Name *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Short Tagline</label>
              <input type="text" name="tagline" value={formData.tagline} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Address</label>
              <textarea name="address" rows={3} value={formData.address} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"></textarea>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <Phone size={24} weight="fill" className="text-primary" />
            <h2 className="text-lg font-bold">Official Contacts</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">WhatsApp</label>
              <input type="text" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} placeholder="628123456789" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Instagram Link</label>
              <input type="url" placeholder="https://instagram.com/..." name="instagram" value={formData.socialLinks.instagram || ""} onChange={(e) => handleSocialLinkChange("instagram", e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" disabled={isSaving}
            className="bg-slate-900 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isSaving ? "Saving Changes..." : "Save Settings"}
          </button>
        </div>

      </form>
    </div>
  );
}
