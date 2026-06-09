import Link from 'next/link';

export default function AdminSidebar() {
  return (
    <aside className="w-64 h-screen bg-slate-900 text-white p-6">
      <h2 className="text-xl font-bold mb-8">Admin Panel</h2>
      <ul className="space-y-4">
        <li><Link href="/admin/dashboard" className="text-slate-300 hover:text-white">Dashboard</Link></li>
        <li><Link href="/admin/reservations" className="text-slate-300 hover:text-white">Reservations</Link></li>
        <li><Link href="/admin/payments" className="text-slate-300 hover:text-white">Payments</Link></li>
      </ul>
    </aside>
  );
}
