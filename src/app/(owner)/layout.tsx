import OwnerLayout from '@/components/layout/OwnerLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OwnerLayout>{children}</OwnerLayout>;
}
