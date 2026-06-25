import { Metadata } from "next";
import AdminSessionsClient from "@/components/admin/AdminSessionsClient";

export const metadata: Metadata = {
  title: "Sesi Operasional | Rooma Ceritarasa",
  description: "Pengaturan sesi operasional restoran",
};

export default function AdminSessionsPage() {
  return <AdminSessionsClient />;
}
