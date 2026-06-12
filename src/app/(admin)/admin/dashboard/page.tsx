import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getAdminOperationalDashboard } from "@/features/admin/admin-dashboard.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminOperationalDashboard();

  return <AdminDashboardClient dashboard={dashboard} />;
}
