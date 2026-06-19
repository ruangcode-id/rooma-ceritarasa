import { Metadata } from "next";
import AdminTablesClient from "@/components/admin/AdminTablesClient";

export const metadata: Metadata = {
  title: "Floor Plan Meja | Rooma Ceritarasa",
  description: "Pengaturan tata letak 2D meja restoran",
};

export default function AdminTablesPage() {
  return <AdminTablesClient />;
}
