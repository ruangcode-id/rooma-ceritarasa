import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getAdminOperationalDashboard } from "@/features/admin/admin-dashboard.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const query = await searchParams;
  const selectedDate =
    typeof query.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : undefined;
  const dashboard = await getAdminOperationalDashboard(selectedDate);

  return <AdminDashboardClient dashboard={dashboard} />;
}
