import { Metadata } from "next";
import AdminReservationClient from "@/components/admin/AdminReservationClient";

export const metadata: Metadata = {
  title: "Admin Reservations | Rooma Ceritarasa",
  description: "Manajemen dan pantauan reservasi tamu",
};

export default function AdminReservationsPage() {
  return <AdminReservationClient />;
}
