"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Info, Clock, ShieldCheck, MapPin, Users, WarningCircle } from "@phosphor-icons/react";

interface ReservationIntroProps {
  onNext: () => void;
}

const AREAS = [
  {
    id: "standard",
    name: "Table 1, 3, 4, 6, 7, 8 (2 Pax) & Table 10 (2-3 Pax)",
    image: "/assets/table-1-3-4-6-7-8.webp",
    description: "Comfortable and cozy seating perfectly designed for 2 to 3 pax.",
    imageClass: "object-cover object-center",
  },
  {
    id: "table2and5",
    name: "Table 2 (2-3 Pax) & Table 5 (3-5 Pax)",
    image: "/assets/table2-and-5.webp",
    description: "Spacious seating located in the heart of our restaurant. Great for small groups and families.",
    imageClass: "object-cover object-bottom",
  },
  {
    id: "table9",
    name: "Table 9 (4-6 Pax)",
    image: "/assets/table-9.webp",
    description: "Spacious seating ideal for groups up to 6 pax, providing a comfortable dining experience.",
    imageClass: "object-cover object-center",
  },
  {
    id: "outdoor",
    name: "Outdoor Terrace (2-4 Pax)",
    image: "/assets/table-outdoor.webp",
    description: "Enjoy the fresh breeze and vibrant atmosphere in our beautiful outdoor seating area.",
    imageClass: "object-cover object-center",
  },
];

export default function ReservationIntro({ onNext }: ReservationIntroProps) {
  const [isAgreed, setIsAgreed] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-center px-4 -mt-6 -mb-12 md:-mt-10 md:-mb-20 relative z-0 pointer-events-none">
        <Image
          src="/assets/logo_no_background.png"
          alt="Rooma Ceritarasa"
          width={315}
          height={315}
          className="w-55 md:w-78.75 h-auto object-contain drop-shadow-sm"
          priority
        />
      </div>

      <div className="px-6 md:px-8 pb-8 space-y-8 relative z-10">
        {/* Area Showcase */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={24} className="text-primary" weight="fill" />
            <h2 className="text-xl font-bold text-slate-900">Seating Areas</h2>
          </div>
          
          <div className="grid gap-8 md:gap-6 mt-4">
            {AREAS.map((area) => (
              <div key={area.id} className="relative w-full">
                <div className="relative w-full aspect-video bg-slate-100">
                  <Image
                    src={area.image}
                    alt={area.name}
                    fill
                    className={`transition-opacity duration-700 ${area.imageClass || "object-cover object-center"}`}
                    priority
                  />
                </div>
                {/* Desktop Text Overlay */}
                <div className="hidden md:flex absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent items-end">
                  <div className="p-8 text-white">
                    <h3 className="text-2xl font-serif mb-2">{area.name}</h3>
                    <p className="text-base text-slate-200 max-w-2xl">{area.description}</p>
                  </div>
                </div>
                {/* Mobile Text Below */}
                <div className="md:hidden py-4">
                  <h3 className="text-lg font-bold font-serif text-slate-900 mb-1">{area.name}</h3>
                  <p className="text-sm text-slate-600">{area.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
            <WarningCircle size={14} weight="bold" className="text-amber-500" />
            Seating preferences are not guaranteed and are subject to availability.
          </p>
        </section>

        {/* House Rules */}
        <section>
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Info size={24} className="text-primary" weight="fill" />
            <h2 className="text-xl font-bold text-slate-900">Reservation Policy</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 bg-slate-100 p-2 rounded-full text-slate-700 shrink-0 h-fit">
                  <ShieldCheck size={20} weight="fill" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">System & Arrival</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">
                    We operate primarily by reservation (80% reservation, 20% walk-in). We allow a <strong className="text-slate-900">30-minute grace period</strong>. Reservations may be released after 30 minutes without notice.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 bg-slate-100 p-2 rounded-full text-slate-700 shrink-0 h-fit">
                  <Clock size={20} weight="fill" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Dining Sessions</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">
                    Each table is reserved for <strong className="text-slate-900">120 minutes</strong>. Our session times are:
                    <br/>• 15:00 - 17:00
                    <br/>• 17:30 - 19:30
                    <br/>• 20:00 - 22:00
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 bg-slate-100 p-2 rounded-full text-slate-700 shrink-0 h-fit">
                  <Users size={20} weight="fill" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Deposit Policy</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">
                    Deposits will be deducted from your final bill:
                    <br/>• <strong className="text-slate-900">1-2 Guests:</strong> No deposit
                    <br/>• <strong className="text-slate-900">3-4 Guests:</strong> Rp 150.000
                    <br/>• <strong className="text-slate-900">5+ Guests:</strong> Rp 300.000
                    <br/>• <strong className="text-slate-900">10+ Guests:</strong> Min. order Rp 1.000.000
                  </p>
                </div>
              </div>
              
              <div className="py-4 border-l-4 border-slate-900 text-sm text-slate-700 mt-6 pl-4">
                <p className="font-bold text-slate-900 mb-1 uppercase tracking-wide text-xs">Advance Orders</p>
                <p>We highly recommend placing advance orders up to one day prior to your reservation for a smoother experience.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Agreement Area */}
        <section className="py-8 mt-4 border-t border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-6 h-6 border-2 border-slate-300 rounded-md peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center group-hover:border-primary">
                <Check size={16} weight="bold" className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="text-sm text-slate-700 font-medium">
              I have read and agree to the <span className="font-bold text-slate-900">House Rules</span>, <span className="font-bold text-slate-900">Deposit Policy</span>, and understand that seating preferences are subject to availability.
            </div>
          </label>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              onNext();
            }}
            disabled={!isAgreed}
            className={`w-full max-w-md mx-auto mt-8 py-4 font-bold text-lg transition-all flex items-center justify-center gap-2 tracking-wide uppercase ${
              isAgreed
                ? "bg-slate-900 text-white hover:bg-black"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Proceed to Reservation
          </button>
        </section>
      </div>
    </div>
  );
}
