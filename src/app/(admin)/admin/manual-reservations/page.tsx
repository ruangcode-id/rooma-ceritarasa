import { Metadata } from "next";
import { Suspense } from "react";
import AdminManualReservationClient from "@/components/admin/AdminManualReservationClient";

export const metadata: Metadata = {
  title: "Admin Manual Reservations | Rooma Ceritarasa",
  description: "Manajemen reservasi manual oleh admin",
};

export default function AdminManualReservationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat data reservasi manual...</div>}>
      <AdminManualReservationClient />
    </Suspense>
  );
}
