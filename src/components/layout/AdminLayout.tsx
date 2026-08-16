"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import GlobalNotificationToast from "../admin/GlobalNotificationToast";
import { AdminScannerListener } from "../admin/AdminScannerListener";
import { List, SignOut } from "@phosphor-icons/react";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface AdminLayoutProps {
  children: React.ReactNode;
  user?: { name?: string | null; email?: string | null };
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fcfbf9]">
      <GlobalNotificationToast />
      <AdminScannerListener />
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b border-[#3a0d13] bg-[#1f0609] px-4 text-white lg:hidden">
        <span className="font-sans text-sm font-semibold uppercase tracking-widest">
          Admin Panel
        </span>

        {/* Right side actions: logout + hamburger */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="rounded-lg p-1.5 text-rose-200/70 transition-colors hover:bg-[#3a0d13] hover:text-white"
            aria-label="Sign out"
            title="Sign Out"
          >
            <SignOut size={22} />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-1.5 hover:bg-[#3a0d13] transition-colors"
            aria-label="Open sidebar"
          >
            <List size={24} />
          </button>
        </div>
      </div>

      <AdminSidebar user={user} isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of this session? You will need to log in again to access the admin dashboard."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
        onClose={() => setShowLogoutConfirm(false)}
      />
      
      {/* Add mt-16 on mobile to account for fixed top bar */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-10 overflow-y-auto mt-16 lg:mt-0">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
