import type { Metadata } from "next";
import { PublicMenuClient } from "@/components/public/PublicMenuClient";

export const metadata: Metadata = {
  title: "Menu | Rooma Ceritarasa",
  description:
    "Explore our curated selection of Indonesian heritage cuisine, woodfired specialties, and signature tasting menus at Rooma Ceritarasa.",
  openGraph: {
    title: "Menu | Rooma Ceritarasa",
    description:
      "A carefully curated collection of authentic Indonesian culinary creations and contemporary tasting menus at Rooma Ceritarasa.",
  },
};

export default function MenuPage() {
  return <PublicMenuClient />;
}
