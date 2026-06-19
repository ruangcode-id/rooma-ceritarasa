import { Metadata } from "next";
import AdminGalleryClient from "@/components/admin/AdminGalleryClient";

export const metadata: Metadata = {
  title: "Galeri Foto | Rooma Ceritarasa Admin",
  description: "Manajemen foto galeri restoran",
};

export default function AdminGalleryPage() {
  return <AdminGalleryClient />;
}
