import { Metadata } from "next";
import OwnerUsersClient from "@/components/owner/OwnerUsersClient";

export const metadata: Metadata = {
  title: "Staff Management | Rooma Ceritarasa Owner",
  description: "Staff and admin account management",
};

export default function OwnerUsersPage() {
  return <OwnerUsersClient />;
}
