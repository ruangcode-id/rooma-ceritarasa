import { Metadata } from "next";
import AdminMenuClient from "@/components/admin/AdminMenuClient";

export const metadata: Metadata = {
  title: "Menu Management | Rooma Ceritarasa Admin",
  description: "Manage menu photos and descriptions for the public menu page.",
};

export default function AdminMenuPage() {
  return <AdminMenuClient />;
}
