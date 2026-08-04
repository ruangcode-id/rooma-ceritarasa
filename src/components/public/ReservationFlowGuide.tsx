"use client";

import { useState, useEffect, useRef } from "react";
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
    title: "Reserve Your Seat",
    icon: Armchair,
    accent: "#1e3a5f",
    accentLight: "#1e3a5f1a",
    highlights: [
      { icon: Armchair,      text: "Browse available tables for your session" },
      { icon: Users,         text: "Select one or multiple tables if your group size requires extra seats" },
      { icon: Info,          text: "Weekend deposit notice may appear for 2-pax bookings" },
      { icon: Info,          text: "Larger tables (T2, T5, T9) have minimum guest requirements" },
    ],
    note: "Grey tables are booked or restricted for smaller groups. For large parties, select multiple tables to meet your total guest count.",
  },
  {
    number: "03",
    title: "Tell Us Who You Are",
    icon: IdentificationCard,
    accent: "#14532d",
    accentLight: "#14532d1a",
    highlights: [
      { icon: IdentificationCard, text: "Enter your full name" },
      { icon: Info,               text: "Provide your WhatsApp number for confirmation" },
      { icon: Info,               text: "Add your email address (required)" },
    ],
    note: "VIP guests can access via a special invite link — no deposit needed.",
  },
  {
    number: "04",
    title: "Secure Your Reservation",
    icon: CreditCard,
    accent: "#7c3a00",
    accentLight: "#7c3a001a",
    highlights: [
      { icon: CreditCard, text: "Pay a deposit to lock in your table" },
      { icon: Info,       text: "Supported: QRIS, Bank Transfer, e-Wallets via Midtrans" },
      { icon: Info,       text: "Some bookings are deposit-free (no payment required)" },
    ],
    note: "The deposit counts toward your minimum order at the restaurant.",
  },
  {
    number: "05",
    title: "Reservation Confirmed",
    icon: CheckCircle,
    accent: "#1f0609",
    accentLight: "#1f06091a",
    highlights: [
      { icon: CheckCircle, text: "Booking confirmation sent via WhatsApp" },
      { icon: Info,        text: "Show the QR code at the entrance for check-in" },
      { icon: Info,        text: "You can cancel anytime via the link in your confirmation" },
    ],
    note: "Have questions? Contact us on WhatsApp before your visit.",
  },
];

// ─────────────────────────────────────────────
//  Smooth step transition hook
// ─────────────────────────────────────────────
type Direction = "next" | "prev";

function useStepTransition(total: number) {
  const [current, setCurrent]       = useState(0);
  const [displayed, setDisplayed]   = useState(0);
  const [phase, setPhase]           = useState<"idle" | "exit" | "enter">("idle");
  const [direction, setDirection]   = useState<Direction>("next");
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (target: number, dir: Direction) => {
    if (phase !== "idle" || target === current) return;
    setDirection(dir);
    setPhase("exit");
    timerRef.current = setTimeout(() => {
      setCurrent(target);
      setPhase("enter");
      timerRef.current = setTimeout(() => {
        setDisplayed(target);
        setPhase("idle");
      }, 300);
    }, 220);
  };

  useEffect(() => {
    if (phase === "enter") setDisplayed(current);
  }, [phase, current]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const next = () => current < total - 1 && go(current + 1, "next");
  const prev = () => current > 0         && go(current - 1, "prev");
  const jump = (idx: number)  => idx !== current && go(idx, idx > current ? "next" : "prev");
  const reset = ()            => { setCurrent(0); setDisplayed(0); setPhase("idle"); };

  return { current, displayed, phase, direction, next, prev, jump, reset };
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function ReservationFlowGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { current, displayed, phase, direction, next, prev, jump, reset } = useStepTransition(STEPS.length);

  const step = STEPS[displayed];
  const isFirst = current === 0;
  const isLast  = current === STEPS.length - 1;

  // Modal open/close with animation
  const open = () => {
    setIsOpen(true);
    requestAnimationFrame(() => setModalVisible(true));
  };

  const close = () => {
    setModalVisible(false);
    setTimeout(() => {
      setIsOpen(false);
      reset();
    }, 300);
  };

  const StepIcon = step.icon;

  // Content slide style
  const contentStyle: React.CSSProperties = (() => {
    if (phase === "exit") {
      return {
        opacity: 0,
        transform: direction === "next" ? "translateX(-24px)" : "translateX(24px)",
        transition: "opacity 200ms ease, transform 200ms ease",
      };
    }
    if (phase === "enter") {
      return {
        opacity: 0,
        transform: direction === "next" ? "translateX(24px)" : "translateX(-24px)",
        transition: "none",
      };
    }
    return {
      opacity: 1,
      transform: "translateX(0)",
      transition: "opacity 280ms cubic-bezier(0.4,0,0.2,1), transform 280ms cubic-bezier(0.4,0,0.2,1)",
    };
  })();

  return (
    <>
      {/* ── FAB Trigger ────────────────────────────────── */}
      <button
        onClick={open}
        aria-label="How to make a reservation"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#1f0609] hover:bg-[#3a0d13] text-white px-4 sm:px-5 py-3 rounded-full text-sm font-semibold shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-2xl"
      >
        <Info size={20} weight="bold" />
        <span className="hidden sm:inline">How to Reserve</span>
        <span className="sm:hidden">Guide</span>
      </button>

      {/* ── Modal ──────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            backgroundColor: modalVisible ? "rgba(15,23,42,0.5)" : "rgba(15,23,42,0)",
            backdropFilter:  modalVisible ? "blur(4px)" : "blur(0px)",
            transition: "background-color 300ms ease, backdrop-filter 300ms ease",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]"
            style={{
              transform:  modalVisible ? "translateY(0) scale(1)"    : "translateY(40px) scale(0.97)",
              opacity:    modalVisible ? 1                            : 0,
              transition: "transform 300ms cubic-bezier(0.34,1.2,0.64,1), opacity 300ms ease",
            }}
          >

            {/* ── Top Bar ──────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Reservation Guide
              </span>
              <button
                onClick={close}
                aria-label="Close guide"
                className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full active:scale-90"
                style={{ transition: "background 150ms, color 150ms, transform 100ms" }}
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* ── Step Progress Bar ─────────────────────── */}
            <div className="flex gap-1.5 px-5 pb-4 shrink-0">
              {STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => jump(idx)}
                  aria-label={`Go to step ${idx + 1}`}
                  className="h-1.5 rounded-full flex-1"
                  style={{
                    background: idx === current ? STEPS[current].accent
                                : idx < current ? `${STEPS[current].accent}40`
                                : "#e2e8f0",
                    transition: "background 400ms ease, flex-grow 300ms ease",
                  }}
                />
              ))}
            </div>

            {/* ── Step Body ─────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div style={contentStyle}>

                {/* Icon & Title */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: step.accentLight }}
                  >
                    <StepIcon size={30} weight="fill" style={{ color: step.accent }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: step.accent }}>
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
            </div>

            {/* ── Footer Navigation ─────────────────────── */}
            <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-3 bg-white">
              <button
                onClick={prev}
                disabled={isFirst}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                style={{
                  color:      isFirst ? "#cbd5e1" : "#475569",
                  background: "transparent",
                  cursor:     isFirst ? "not-allowed" : "pointer",
                }}
                onMouseEnter={e => !isFirst && ((e.currentTarget as HTMLElement).style.background = "#f1f5f9")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <CaretLeft size={15} weight="bold" />
                Back
              </button>

              {/* Animated step dots */}
              <div className="flex gap-1.5 items-center">
                {STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width:      idx === current ? "16px" : "8px",
                      height:     "8px",
                      borderRadius: "99px",
                      background: idx === current ? STEPS[current].accent : "#e2e8f0",
                      transition: "width 300ms cubic-bezier(0.4,0,0.2,1), background 300ms ease",
                    }}
                  />
                ))}
              </div>

              {isLast ? (
                <button
                  onClick={close}
                  className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md active:scale-95"
                  style={{
                    background:  "#1f0609",
                    transition:  "background 150ms, transform 100ms",
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#3a0d13")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#1f0609")}
                >
                  Start Booking
                  <ArrowRight size={15} weight="bold" />
                </button>
              ) : (
                <button
                  onClick={next}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95"
                  style={{ transition: "background 150ms, transform 100ms" }}
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
