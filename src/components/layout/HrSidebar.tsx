"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Briefcase,
  SignOut,
  X,
} from "@phosphor-icons/react";

const MENU_GROUPS = [
  {
    title: "Human Resources",
    items: [
      { name: "Careers", href: "/hr/careers", icon: Briefcase },
    ],
  },
];

interface HrSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  user?: any;
}

export default function HrSidebar({
  isOpen = false,
  onClose,
  user,
}: HrSidebarProps) {
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
        className={`fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col bg-bg-dark text-slate-300 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-6">
          <span className="font-sans text-xl font-semibold uppercase tracking-widest text-white">
            HR Panel
          </span>

          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
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
                            ? "border-r-2 border-indigo-500 bg-indigo-500/20 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Icon
                          size={20}
                          weight={isActive ? "fill" : "regular"}
                          className={`mr-3 ${
                            isActive
                              ? "text-white"
                              : "text-slate-500 group-hover:text-white"
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
        <div className="shrink-0 border-t border-slate-800 p-4 pb-6">
          {/* User Profile & Sign Out Unified */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-800 p-3 transition-all duration-200">
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white uppercase">
              {user?.name ? user.name.charAt(0) : "HR"}
            </div>

            {/* Name + Email */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user?.name || "HR Staff"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {user?.email || "hr@rooma.com"}
              </p>
            </div>

            {/* Logout */}
            <button
              title="Sign Out"
              aria-label="Sign out from HR panel"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-700 hover:text-white"
            >
              <SignOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of this session? You will need to log in again to access the HR dashboard."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
