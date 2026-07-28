import { auth } from '@/auth';
import AdminLayout from '@/components/layout/AdminLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <AdminLayout user={session?.user}>{children}</AdminLayout>;
}
