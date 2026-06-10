"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { List } from "@phosphor-icons/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fcfbf9]">
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b border-[#3a0d13] bg-[#1f0609] px-4 text-white lg:hidden">
        <span className="font-sans text-sm font-semibold uppercase tracking-widest">
          Admin Panel
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-1.5 hover:bg-[#3a0d13] transition-colors"
          aria-label="Open sidebar"
        >
          <List size={24} />
        </button>
      </div>

      <AdminSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
      
      {/* Add mt-16 on mobile to account for fixed top bar */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-10 overflow-y-auto mt-16 lg:mt-0">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
