import { OwnerDashboardClient } from "@/components/owner/OwnerDashboardClient";
import { getOwnerPaymentAnalytics } from "@/features/owner/owner-analytics.service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner Analytics | Rooma Ceritarasa",
  description: "Ringkasan pendapatan dan reservasi untuk owner",
};

export default async function OwnerDashboardPage() {
  const analytics = await getOwnerPaymentAnalytics();

  return <OwnerDashboardClient analytics={analytics} />;
}
