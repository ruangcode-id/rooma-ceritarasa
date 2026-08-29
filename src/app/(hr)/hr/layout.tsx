import { Metadata } from "next";
import HrLayout from "@/components/layout/HrLayout";

export const metadata: Metadata = {
  title: "HR Panel | Rooma Ceritarasa",
  description: "Panel for Human Resources",
};

import { auth } from "@/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <HrLayout user={session?.user}>{children}</HrLayout>;
}
