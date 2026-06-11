import { OwnerReportsClient } from "@/components/owner/OwnerReportsClient";
import { getOwnerPaymentAnalytics } from "@/features/owner/owner-analytics.service";

export const dynamic = "force-dynamic";

export default async function OwnerReportsPage() {
  const analytics = await getOwnerPaymentAnalytics();

  return <OwnerReportsClient analytics={analytics} />;
}
