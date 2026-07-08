import { Metadata } from "next";
import OwnerSettingsClient from "@/components/owner/OwnerSettingsClient";

export const metadata: Metadata = {
  title: "Master Settings | Rooma Ceritarasa Owner",
  description: "Restaurant operational settings management",
};

export default function OwnerSettingsPage() {
  return <OwnerSettingsClient />;
}
