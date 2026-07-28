import { auth } from '@/auth';
import OwnerLayout from '@/components/layout/OwnerLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <OwnerLayout user={session?.user}>{children}</OwnerLayout>;
}
