"use client";

import { useState } from "react";
import {
  Info,
  X,
  CaretRight,
  CaretLeft,
  CalendarBlank,
  Armchair,
  IdentificationCard,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Clock,
  Users,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────
//  Step data — mirrors the actual wizard flow
// ─────────────────────────────────────────────
const STEPS = [
  {
    number: "01",
    label: "Pick a Schedule",
    title: "Choose Your Date & Session",
    icon: CalendarBlank,
    accent: "#1f0609",
    accentLight: "#1f06091a",
    highlights: [
      { icon: CalendarBlank, text: "Select an available date from the calendar" },
      { icon: Clock,         text: "Pick a session — Lunch or Dinner" },
      { icon: Users,         text: "Set the number of guests (Pax)" },
    ],
    note: "Greyed-out dates are fully booked or unavailable.",
  },
  {
    number: "02",
    label: "Select a Table",
    title: "Reserve Your Seat",
    icon: Armchair,
    accent: "#1e3a5f",
    accentLight: "#1e3a5f1a",
    highlights: [
      { icon: Armchair,      text: "Browse available tables for your session" },
      { icon: Users,         text: "Select one or more tables to fit your group" },
      { icon: Info,          text: "A weekend deposit notice may appear for 2-pax bookings" },
    ],
    note: "Grey tables are already booked. You can select multiple tables.",
  },
  {
    number: "03",
    label: "Fill Your Details",
    title: "Tell Us Who You Are",
    icon: IdentificationCard,
    accent: "#14532d",
    accentLight: "#14532d1a",
    highlights: [
      { icon: IdentificationCard, text: "Enter your full name" },
      { icon: Info,               text: "Provide your WhatsApp number for confirmation" },
      { icon: Info,               text: "Add your email address (required)" },
    ],
    note: "VIP guests can access their booking via a special invite link — no deposit needed.",
  },
  {
    number: "04",
    label: "Pay the Deposit",
    title: "Secure Your Reservation",
    icon: CreditCard,
    accent: "#7c3a00",
    accentLight: "#7c3a001a",
    highlights: [
      { icon: CreditCard, text: "Pay a deposit to lock in your table" },
      { icon: Info,       text: "Supported: QRIS, Bank Transfer, e-Wallets via Midtrans" },
      { icon: Info,       text: "Some bookings are deposit-free (no payment required)" },
    ],
    note: "The deposit is counted toward your minimum order at the restaurant.",
  },
  {
    number: "05",
    label: "You're All Set!",
    title: "Reservation Confirmed",
    icon: CheckCircle,
    accent: "#1f0609",
    accentLight: "#1f06091a",
    highlights: [
      { icon: CheckCircle, text: "You'll receive a booking confirmation via WhatsApp" },
      { icon: Info,        text: "Show the QR code at the entrance for check-in" },
      { icon: Info,        text: "You can cancel anytime via the link in your confirmation" },
    ],
    note: "Have questions? Contact us on WhatsApp before your visit.",
  },
];

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function ReservationFlowGuide() {
  const [isOpen, setIsOpen]       = useState(false);
  const [current, setCurrent]     = useState(0);

  const step = STEPS[current];
  const isFirst = current === 0;
  const isLast  = current === STEPS.length - 1;

  const next  = () => !isLast  && setCurrent(c => c + 1);
  const prev  = () => !isFirst && setCurrent(c => c - 1);

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setCurrent(0), 300);
  };

  const StepIcon = step.icon;

  return (
    <>
      {/* ── FAB Trigger ────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="How to make a reservation"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#1f0609] hover:bg-[#3a0d13] text-white px-4 sm:px-5 py-3 rounded-full text-sm font-semibold shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <Info size={20} weight="bold" />
        <span className="hidden sm:inline">How to Reserve</span>
        <span className="sm:hidden">Guide</span>
      </button>

      {/* ── Modal ──────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

            {/* ── Top Bar ──────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Reservation Guide
                </span>
              </div>
              <button
                onClick={close}
                aria-label="Close guide"
                className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* ── Step Progress Bar ─────────────────────── */}
            <div className="flex gap-1.5 px-5 pb-4 shrink-0">
              {STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  aria-label={`Go to step ${idx + 1}`}
                  className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                    idx === current ? "bg-[#1f0609]" : idx < current ? "bg-[#1f0609]/30" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* ── Step Body ─────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">

              {/* Icon & Step label */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: step.accentLight }}
                >
                  <StepIcon size={30} weight="fill" style={{ color: step.accent }} />
                </div>
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5"
                    style={{ color: step.accent }}
                  >
                    Step {step.number} of {STEPS.length}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{step.title}</h3>
                </div>
              </div>

              {/* Highlights */}
              <ul className="space-y-3 mb-5">
                {step.highlights.map((h, i) => {
                  const HL = h.icon;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: step.accentLight }}
                      >
                        <HL size={14} weight="fill" style={{ color: step.accent }} />
                      </div>
                      <span className="text-sm text-slate-700 leading-relaxed">{h.text}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Note */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-700">💡 Note: </span>
                  {step.note}
                </p>
              </div>
            </div>

            {/* ── Footer Navigation ─────────────────────── */}
            <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-3 bg-white">
              <button
                onClick={prev}
                disabled={isFirst}
                className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                  isFirst
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CaretLeft size={15} weight="bold" />
                Back
              </button>

              {/* Step dots (mobile-friendly) */}
              <div className="flex gap-1.5">
                {STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`rounded-full transition-all duration-300 ${
                      idx === current ? "w-4 h-2 bg-[#1f0609]" : "w-2 h-2 bg-slate-200"
                    }`}
                  />
                ))}
              </div>

              {isLast ? (
                <button
                  onClick={close}
                  className="flex items-center gap-2 bg-[#1f0609] hover:bg-[#3a0d13] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-md"
                >
                  Start Booking
                  <ArrowRight size={15} weight="bold" />
                </button>
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95"
                >
                  Next
                  <CaretRight size={15} weight="bold" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
