"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  SquaresFour,
  CalendarCheck,
  MapPinLine,
  CreditCard,
  Clock,
  CalendarX,
  UsersThree,
  Image,
  Briefcase,
  BellRinging,
  Star,
  Gear,
  SignOut,
  X,
} from "@phosphor-icons/react";

const MENU_GROUPS = [
  {
    title: "Operations",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: SquaresFour },
      { name: "Reservations", href: "/admin/reservations", icon: CalendarCheck },
      { name: "Payments", href: "/admin/payments", icon: CreditCard },
      { name: "Check-in", href: "/admin/check-in", icon: MapPinLine },
    ],
  },
  {
    title: "Restaurant Setup",
    items: [
      // Klien meminta fitur Tables disembunyikan dari UI Admin sementara waktu
      // { name: "Tables", href: "/admin/tables", icon: Armchair },
      { name: "Sessions", href: "/admin/sessions", icon: Clock },
      { name: "Blocked Dates", href: "/admin/blocked-dates", icon: CalendarX },
    ],
  },
  {
    title: "Content & CRM",
    items: [
      { name: "Guests", href: "/admin/guests", icon: UsersThree },
      { name: "Gallery", href: "/admin/gallery", icon: Image },
      { name: "Careers", href: "/admin/careers", icon: Briefcase },
      { name: "Notifications", href: "/admin/notifications", icon: BellRinging },
      { name: "VIP Assign", href: "/admin/vip", icon: Star },
      { name: "Settings", href: "/admin/settings", icon: Gear },
    ],
  },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  isOpen = false,
  onClose,
}: AdminSidebarProps) {
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
            Admin Panel
          </span>

          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-rose-200/70 transition-colors hover:bg-[#3a0d13] hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="mb-8">
              <h3 className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.2em] text-rose-300/60">
                {group.title}
              </h3>

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "border-r-2 border-primary bg-primary/20 text-white"
                            : "text-rose-200/70 hover:bg-[#3a0d13] hover:text-white"
                        }`}
                      >
                        <Icon
                          size={20}
                          weight={isActive ? "fill" : "regular"}
                          className={`mr-3 ${
                            isActive
                              ? "text-white"
                              : "text-rose-300/50 group-hover:text-white"
                          }`}
                        />

                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#3a0d13] p-4">
          {/* User Profile & Sign Out Unified */}
          <div className="flex items-center justify-between rounded-xl bg-[#3a0d13] p-3 transition-all duration-200">
            <div className="flex min-w-0 items-center">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-800 text-sm font-medium text-white">
                SA
              </div>

              <div className="ml-3 min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Admin Staff
                </p>
                <p className="truncate text-xs text-rose-300/60">
                  admin@rooma.com
                </p>
              </div>
            </div>

            <button
              title="Sign Out"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-rose-200/70 transition-all duration-200 hover:bg-[#4a1019] hover:text-white"
            >
              <SignOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of this session? You will need to log in again to access the admin dashboard."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
