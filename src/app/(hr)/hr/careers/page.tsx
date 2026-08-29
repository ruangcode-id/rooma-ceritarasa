import { Metadata } from "next";
import HrCareersClient from "@/components/hr/HrCareersClient";

export const metadata: Metadata = {
  title: "Careers | Rooma Ceritarasa HR",
  description: "Manajemen lowongan pekerjaan",
};

export default function HrCareersPage() {
  return <HrCareersClient />;
}
