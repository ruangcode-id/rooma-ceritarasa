import { Metadata } from "next";
import AdminMenuClient from "@/components/admin/AdminMenuClient";

export const metadata: Metadata = {
  title: "Menu Management | Rooma Ceritarasa Owner",
  description: "Manage menu photos and descriptions for the public menu page.",
};

export default function OwnerMenuPage() {
  return <AdminMenuClient />;
}
