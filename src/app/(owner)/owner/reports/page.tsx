import { OwnerReportsClient } from "@/components/owner/OwnerReportsClient";
import { getOwnerPaymentAnalytics } from "@/features/owner/owner-analytics.service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financial Reports | Rooma Ceritarasa",
  description: "Laporan keuangan dan transaksi pembayaran untuk owner",
};

export default async function OwnerReportsPage() {
  const analytics = await getOwnerPaymentAnalytics();

  return <OwnerReportsClient analytics={analytics} />;
}