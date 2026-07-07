import { Metadata } from "next";
import AdminReservationClient from "@/components/admin/AdminReservationClient";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Admin Reservations | Rooma Ceritarasa",
  description: "Manajemen dan pantauan reservasi tamu",
};

export default function AdminReservationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat halaman...</div>}>
      <AdminReservationClient />
    </Suspense>
  );
}
