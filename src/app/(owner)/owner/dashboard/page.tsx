import { OwnerDashboardClient } from "@/components/owner/OwnerDashboardClient";
import { getOwnerPaymentAnalytics } from "@/features/owner/owner-analytics.service";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const analytics = await getOwnerPaymentAnalytics();

  return <OwnerDashboardClient analytics={analytics} />;
}
