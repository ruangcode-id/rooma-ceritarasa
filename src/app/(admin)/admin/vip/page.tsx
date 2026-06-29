import { Metadata } from "next";
import AdminVipClient from "@/components/admin/AdminVipClient";

export const metadata: Metadata = {
  title: "VIP Program | Rooma Ceritarasa",
  description: "Manajemen keanggotaan VIP dan loyalitas pelanggan",
};

export default function AdminVipPage() {
  return <AdminVipClient />;
}
