import { Metadata } from "next";
import AdminCareersClient from "@/components/admin/AdminCareersClient";

export const metadata: Metadata = {
  title: "Lowongan Kerja | Rooma Ceritarasa Admin",
  description: "Manajemen lowongan pekerjaan",
};

export default function AdminCareersPage() {
  return <AdminCareersClient />;
}
