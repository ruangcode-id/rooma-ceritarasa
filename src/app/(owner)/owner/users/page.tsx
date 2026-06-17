import { Metadata } from "next";
import OwnerUsersClient from "@/components/owner/OwnerUsersClient";

export const metadata: Metadata = {
  title: "Manajemen Staf | Rooma Ceritarasa Owner",
  description: "Manajemen akun staf dan admin",
};

export default function OwnerUsersPage() {
  return <OwnerUsersClient />;
}
