import { Metadata } from "next";
import { Suspense } from "react";
import AdminManualReservationCreateClient from "@/components/admin/AdminManualReservationCreateClient";

export const metadata: Metadata = {
  title: "Create Manual Reservation | Rooma Ceritarasa",
  description: "Form input reservasi manual",
};

export default function AdminManualReservationCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading form...</div>}>
      <AdminManualReservationCreateClient />
    </Suspense>
  );
}
