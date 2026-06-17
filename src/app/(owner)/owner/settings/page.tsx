import { Metadata } from "next";
import OwnerSettingsClient from "@/components/owner/OwnerSettingsClient";

export const metadata: Metadata = {
  title: "Pengaturan Master Restoran | Rooma Ceritarasa Owner",
  description: "Manajemen pengaturan operasional restoran",
};

export default function OwnerSettingsPage() {
  return <OwnerSettingsClient />;
}
