import { Suspense } from "react";
import AdminNotificationsClient from "@/components/admin/AdminNotificationsClient";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">System Notifications</h1>
        <p className="text-slate-500">Notification center and recent activity history.</p>
      </div>
      <Suspense fallback={<div className="p-4 text-center text-slate-500">Loading notifications...</div>}>
        <AdminNotificationsClient />
      </Suspense>
    </div>
  );
}
