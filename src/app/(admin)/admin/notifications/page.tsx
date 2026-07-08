import AdminNotificationsClient from "@/components/admin/AdminNotificationsClient";

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Notifikasi Sistem</h1>
        <p className="text-slate-500">Pusat pemberitahuan dan riwayat aktivitas terbaru.</p>
      </div>
      <AdminNotificationsClient />
    </div>
  );
}
