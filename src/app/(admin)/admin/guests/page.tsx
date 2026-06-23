import { GuestCrmClient } from "@/components/admin/GuestCrmClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Guests | Rooma Ceritarasa",
  description: "Manajemen profil, label, catatan, dan kunjungan tamu",
};

export default function AdminGuestsPage() {
  return <GuestCrmClient />;
}
