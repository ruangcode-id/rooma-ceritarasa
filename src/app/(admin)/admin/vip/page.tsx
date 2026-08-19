import { Metadata } from "next";
import { Suspense } from "react";
import AdminVipClient from "@/components/admin/AdminVipClient";

export const metadata: Metadata = {
  title: "VIP Program | Rooma Ceritarasa",
  description: "Manajemen keanggotaan VIP dan loyalitas pelanggan",
};

export default function AdminVipPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat data VIP...</div>}>
      <AdminVipClient />
    </Suspense>
  );
}
