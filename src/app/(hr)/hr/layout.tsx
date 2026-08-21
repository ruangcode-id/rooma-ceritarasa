import { Metadata } from "next";
import HrLayout from "@/components/layout/HrLayout";

export const metadata: Metadata = {
  title: "HR Panel | Rooma Ceritarasa",
  description: "Panel for Human Resources",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <HrLayout>{children}</HrLayout>;
}
