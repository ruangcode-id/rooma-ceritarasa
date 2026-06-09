import Link from 'next/link';

export default function OwnerSidebar() {
  return (
    <aside className="w-64 h-screen bg-indigo-950 text-white p-6">
      <h2 className="text-xl font-bold mb-8 text-amber-400">Owner Panel</h2>
      <ul className="space-y-4">
        <li><Link href="/owner/dashboard" className="text-slate-300 hover:text-white">Analytics</Link></li>
        <li><Link href="/owner/reports" className="text-slate-300 hover:text-white">Financial Reports</Link></li>
        <li><Link href="/owner/users" className="text-slate-300 hover:text-white">Manage Admins</Link></li>
        <li><Link href="/owner/settings" className="text-slate-300 hover:text-white">Settings</Link></li>
      </ul>
    </aside>
  );
}
