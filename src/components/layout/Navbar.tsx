"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);


  // Pastikan navbar disembunyikan saat pertama kali masuk ke halaman Home
  // Ini memperbaiki bug di mana isVisible "tersangkut" menjadi true dari halaman sebelumnya
  useEffect(() => {
    if (pathname === "/") {
      setIsVisible(false);
    }
  }, [pathname]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isHome) return; // Only apply auto-hide logic on Home page

    const resetTimer = () => {
      setIsVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      
      timerRef.current = setTimeout(() => {
        if (!isOpen) {
          setIsVisible(false);
        }
      }, 2500);
    };

    window.addEventListener("scroll", resetTimer);

    // Jika menu baru saja ditutup (isOpen == false), mulai timer
    // supaya navbar otomatis bersembunyi.
    if (!isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    }

    return () => {
      window.removeEventListener("scroll", resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, isHome]);

  // Efek untuk disable scroll di body HANYA untuk ukuran mobile saat menu fullscreen terbuka
  useEffect(() => {
    const handleResize = () => {
      if (isOpen && window.innerWidth < 1024) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    handleResize(); // Panggil saat state berubah
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  return (
    <>
      <nav
        className={`fixed left-0 top-0 z-50 w-full bg-white transition-transform duration-500 ease-in-out border-b border-gray-100 ${
          isHome
            ? isVisible ? "translate-y-0" : "-translate-y-full" // Home behavior
            : "translate-y-0" // Inner page behavior (always visible)
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="flex h-20 items-center justify-between">
            {isHome ? (
              <>
                {/* KIRI: Kosong sengaja (asimetris minimalis) */}
                <div className="w-1/3 lg:w-1/4"></div>

                {/* TENGAH: Logo */}
                <div className="flex w-1/3 lg:w-2/4 justify-center">
                  <Link href="/" className="flex items-center justify-center">
                    <Image 
                      src="/assets/logo_no_background.png" 
                      alt="Rooma Ceritarasa Logo" 
                      width={140} 
                      height={45} 
                      className="object-contain"
                      style={{ width: "auto", height: "auto" }}
                      priority
                    />
                  </Link>
                </div>

                {/* KANAN: Hamburger Menu */}
                <div className="flex w-1/3 lg:w-1/4 justify-end">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-slate-900 hover:text-primary transition-colors focus:outline-none"
                    aria-label="Toggle menu"
                  >
                    {isOpen ? (
                      <X size={28} weight="regular" className="hidden lg:block text-slate-900" />
                    ) : null}
                    <List size={28} weight="regular" className={isOpen ? "lg:hidden" : ""} />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* LOGO DI KIRI UNTUK INNER PAGE */}
                <div className="flex items-center">
                  <Link href="/" className="flex items-center">
                    <Image 
                      src="/assets/logo_no_background.png" 
                      alt="Rooma Ceritarasa Logo" 
                      width={120} 
                      height={40} 
                      className="object-contain"
                      style={{ width: "auto", height: "auto" }}
                      priority
                    />
                  </Link>
                </div>

                {/* NAVIGASI DI TENGAH/KANAN UNTUK DESKTOP */}
                <div className="hidden lg:flex space-x-8 font-sans text-xs tracking-widest font-semibold uppercase text-slate-700">
                  <Link href="/" className="hover:text-primary transition-colors py-2">Home</Link>
                  <Link href="/reservasi" className="hover:text-primary transition-colors py-2">Reservation</Link>
                  <Link href="/gallery" className="hover:text-primary transition-colors py-2">Gallery</Link>
                  <Link href="/event" className="hover:text-primary transition-colors py-2">Events</Link>
                  <Link href="/career" className="hover:text-primary transition-colors py-2">Careers</Link>
                </div>

                {/* HAMBURGER KHUSUS MOBILE */}
                <div className="flex lg:hidden justify-end">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-slate-900 hover:text-primary transition-colors focus:outline-none"
                    aria-label="Toggle menu"
                  >
                    <List size={28} weight="regular" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* DROPDOWN MENU (HANYA MUNCUL DI DESKTOP >= lg, DAN HANYA UNTUK HOME PAGE) */}
          {isHome && (
            <div
              className={`absolute right-4 top-20 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl transition-all duration-300 hidden lg:block ${
                isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
              }`}
            >
            <div className="flex flex-col space-y-1 font-sans text-sm tracking-widest font-semibold uppercase text-slate-700">
              <Link href="/" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-3 hover:bg-slate-50 hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/reservasi" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-3 hover:bg-slate-50 hover:text-primary transition-colors">
                Reservation
              </Link>
              <Link href="/gallery" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-3 hover:bg-slate-50 hover:text-primary transition-colors">
                Gallery
              </Link>
              <Link href="/event" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-3 hover:bg-slate-50 hover:text-primary transition-colors">
                Events
              </Link>
              <Link href="/career" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-3 hover:bg-slate-50 hover:text-primary transition-colors">
                Careers
              </Link>
            </div>
            </div>
          )}
        </div>
      </nav>

      {/* FULLSCREEN OVERLAY MENU (HANYA MUNCUL DI MOBILE < lg) */}
      <div
        className={`fixed inset-0 z-[60] bg-white/95 backdrop-blur-md text-slate-900 transition-opacity duration-500 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex h-20 items-center justify-end px-4 sm:px-6">
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-900 hover:text-primary transition-colors focus:outline-none mt-2"
            aria-label="Close menu"
          >
            <X size={32} weight="light" />
          </button>
        </div>

        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center space-y-8 font-sans text-3xl font-light uppercase tracking-widest">
          <Link href="/" onClick={() => setIsOpen(false)} className="hover:text-primary transition-colors hover:scale-105 transform duration-300">
            Home
          </Link>
          <Link href="/reservasi" onClick={() => setIsOpen(false)} className="hover:text-primary transition-colors hover:scale-105 transform duration-300">
            Reservation
          </Link>
          <Link href="/gallery" onClick={() => setIsOpen(false)} className="hover:text-primary transition-colors hover:scale-105 transform duration-300">
            Gallery
          </Link>
          <Link href="/event" onClick={() => setIsOpen(false)} className="hover:text-primary transition-colors hover:scale-105 transform duration-300">
            Special Events
          </Link>
          <Link href="/career" onClick={() => setIsOpen(false)} className="hover:text-primary transition-colors hover:scale-105 transform duration-300">
            Careers
          </Link>
        </div>
      </div>
    </>
  );
}
