"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ChartLineUp,
  CurrencyCircleDollar,
  UsersThree,
  GearSix,
  SignOut,
  X
} from "@phosphor-icons/react";

const OWNER_MENU = [
  { name: "Analytics Dashboard", href: "/owner/dashboard", icon: ChartLineUp },
  { name: "Financial Reports", href: "/owner/reports", icon: CurrencyCircleDollar },
  { name: "Manage Admins", href: "/owner/users", icon: UsersThree },
  { name: "Master Settings", href: "/owner/settings", icon: GearSix },
];

interface OwnerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function OwnerSidebar({ isOpen = false, onClose }: OwnerSidebarProps) {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#1f0609] text-rose-100 shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-[#3a0d13] px-6">
          <span className="font-sans text-xl font-semibold uppercase tracking-widest text-white">
            Owner Panel
          </span>
          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-rose-200/70 hover:bg-[#3a0d13] hover:text-white lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-8">
        <h3 className="mb-4 px-3 text-xs font-bold uppercase tracking-[0.2em] text-rose-300/60">
          Executive
        </h3>
        <ul className="space-y-2">
          {OWNER_MENU.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary/20 text-white border-r-2 border-primary"
                      : "text-rose-200/70 hover:bg-[#3a0d13] hover:text-white"
                  }`}
                >
                  <Icon
                    size={22}
                    weight={isActive ? "fill" : "regular"}
                    className={`mr-3 ${
                      isActive ? "text-white" : "text-rose-300/50 group-hover:text-white"
                    }`}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t border-[#3a0d13] p-4">
        {/* User Profile & Sign Out Unified */}
        <div className="flex items-center justify-between rounded-xl bg-[#3a0d13] p-3 transition-all duration-200">
          <div className="flex items-center min-w-0">
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-rose-800 flex items-center justify-center text-white font-medium text-sm">
              OW
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Owner</p>
              <p className="text-xs text-rose-300/60 truncate">owner@rooma.com</p>
            </div>
          </div>
          <button 
            title="Sign Out"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-rose-200/70 hover:bg-[#4a1019] hover:text-white transition-all duration-200"
          >
            <SignOut size={20} />
          </button>
        </div>
      </div>
    </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of this session? You will need to log in again to access the owner dashboard."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
