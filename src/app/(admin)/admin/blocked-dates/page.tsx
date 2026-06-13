import { Metadata } from "next";
import AdminBlockedDatesClient from "@/components/admin/AdminBlockedDatesClient";

export const metadata: Metadata = {
  title: "Kalender Libur | Rooma Ceritarasa",
  description: "Pengaturan tanggal libur restoran",
};

export default function AdminBlockedDatesPage() {
  return <AdminBlockedDatesClient />;
}
