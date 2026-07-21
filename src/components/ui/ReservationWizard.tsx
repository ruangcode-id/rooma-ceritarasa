"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useRef } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CaretLeft, CaretRight, X, CircleNotch, CheckCircle, Info } from "@phosphor-icons/react";
import Image from "next/image";
import Script from "next/script";
import { GuestReservationForm } from "../forms/GuestReservationForm";
import { payWithSnap } from "@/lib/midtrans-snap-client";

interface Session {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
}

type BlockedDatesResponse = {
  success: boolean;
  data?: string[];
};

const HERO_IMAGES = [
  "/assets/slider1.webp",
  "/assets/slider2.webp",
  "/assets/slider3.webp",
  "/assets/slider4.webp",
  "/assets/slider5.webp",
  "/assets/slider6.webp",
];

type ModalType = "guests" | "date" | "time" | null;

type CreateReservationResult = {
  reservationId: string;
  guestId: string;
  status: string;
  tableIds: string[];
  expiresAt: string | null;
  cancelToken: string;
  paymentToken: string;
};

type ReservationPaymentResult = {
  paymentRequired: boolean;
  reservationId: string;
  partySize: number;
  amount: number;
  minimumOrder: number | null;
  token?: string;
  orderId?: string;
  redirectUrl?: string;
  message?: string;
};

type PaymentState =
  | "idle"
  | "creating"
  | "waiting_snap"
  | "pending"
  | "paid"
  | "not_required"
  | "failed";

type ReservationWizardProps = {
  snapClientKey: string;
  snapScriptUrl: string;
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ReservationWizard({
  snapClientKey,
  snapScriptUrl,
}: ReservationWizardProps) {
  const searchParams = useSearchParams();
  const vipToken = searchParams.get("vipToken");

  // --- States ---
  const [partySize, setPartySize] = useState<number>(2);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [snapReady, setSnapReady] = useState(false);
  const [reservationResult, setReservationResult] =
    useState<CreateReservationResult | null>(null);
  const [paymentResult, setPaymentResult] =
    useState<ReservationPaymentResult | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());

  // --- Image Slider ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    async function fetchBlockedDates() {
      setLoadingDates(true);
      try {
        const month = currentMonth.getMonth() + 1;
        const year = currentMonth.getFullYear();
        const res = await fetch(`/api/public/blocked-dates?month=${month}&year=${year}`);
        const data: BlockedDatesResponse = await res.json();
        
        if (data.success) {
          const blocked = new Set<string>();
          (data.data ?? []).forEach((dateStr) => {
            blocked.add(dateStr.split("T")[0]);
          });
          setBlockedDates(blocked);
        }
      } catch {
        console.error("Failed to fetch blocked dates");
      } finally {
        setLoadingDates(false);
      }
    }
    fetchBlockedDates();
  }, [currentMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    
    async function fetchSessions() {
      setLoadingSessions(true);
      try {
        const dateStr = format(selectedDate as Date, "yyyy-MM-dd");
        const res = await fetch(`/api/public/sessions?date=${dateStr}`);
        const data = await res.json();
        
        if (data.success) {
          setSessions(data.data);
        }
      } catch {
        console.error("Failed to fetch sessions");
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || !selectedSessionId) return;
    
    async function fetchTables() {
      setLoadingTables(true);
      try {
        const dateStr = format(selectedDate as Date, "yyyy-MM-dd");
        const res = await fetch(`/api/public/tables?date=${dateStr}&sessionId=${selectedSessionId}`);
        const data = await res.json();
        
        if (data.success) {
          setTables(data.data);
        }
      } catch {
        console.error("Failed to fetch tables");
      } finally {
        setLoadingTables(false);
      }
    }
    fetchTables();
  }, [selectedDate, selectedSessionId]);

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } else if (step === 3) {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  }, [step]);

  // --- Handlers ---
  const handleDateSelect = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    if (isBefore(day, today) || blockedDates.has(dateStr)) return;
    
    setSelectedDate(day);
    setSessions([]);
    setTables([]);
    setSelectedSessionId(null);
    setSelectedTableIds([]);
    setActiveModal(null); // Close modal instead of auto-advance
  };

  const toggleTable = (id: string) => {
    setSelectedTableIds(prev => {
      if (prev.includes(id)) return prev.filter(tId => tId !== id);
      return [...prev, id];
    });
  };

  const openSnapPayment = (token: string) => {
    try {
      const opened = payWithSnap(token, {
        onSuccess: () => {
          setPaymentState("paid");
          setPaymentError(null);
        },
        onPending: () => {
          setPaymentState("pending");
          setPaymentError(null);
        },
        onError: () => {
          setPaymentState("failed");
          setPaymentError("Pembayaran belum berhasil. Silakan coba lagi.");
        },
        onClose: () => {
          setPaymentState("waiting_snap");
        },
      });

      if (!opened) return;

      setPaymentError(null);
    } catch (error) {
      setPaymentState("waiting_snap");
      setPaymentError(
        error instanceof Error ? error.message : "Midtrans Snap belum siap."
      );
    }
  };

  const createReservationPayment = async (reservationId: string, paymentToken: string) => {
    setPaymentState("creating");
    setPaymentError(null);

    if (!snapClientKey) {
      setPaymentState("failed");
      setPaymentError("Konfigurasi Midtrans belum tersedia.");
      return;
    }

    try {
      const response = await fetch("/api/public/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentToken,
          paymentType: "deposit",
        }),
      });

      const payload = (await response.json()) as
        | { success: true; data: ReservationPaymentResult }
        | { success: false; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? "Gagal membuat transaksi pembayaran."
            : payload.error ?? "Gagal membuat transaksi pembayaran."
        );
      }

      setPaymentResult(payload.data);

      if (!payload.data.paymentRequired) {
        setPaymentState("not_required");
        return;
      }

      if (!payload.data.token) {
        throw new Error("Token pembayaran tidak tersedia.");
      }

      if (!snapReady) {
        setPaymentState("waiting_snap");
        return;
      }

      setPaymentState("waiting_snap");
      openSnapPayment(payload.data.token);
    } catch (error) {
      setPaymentState("failed");
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Gagal membuat transaksi pembayaran."
      );
    }
  };

  const handleReservationSuccess = async (result: CreateReservationResult) => {
    setReservationResult(result);
    setStep(3);
    await createReservationPayment(result.reservationId, result.paymentToken);
  };

  // --- Calendar Helpers ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  return (
    <div className="flex flex-col items-center w-full relative">
      {snapClientKey ? (
        <Script
          src={snapScriptUrl}
          strategy="afterInteractive"
          data-client-key={snapClientKey}
          onReady={() => setSnapReady(true)}
          onError={() => {
            setSnapReady(false);
            setPaymentError("Gagal memuat Midtrans Snap.");
          }}
        />
      ) : null}
      
      {/* 1. Hero Image */}
      {step !== 3 && (
        <div className="w-full max-w-4xl h-48 md:h-80 relative overflow-hidden shadow-sm mb-8 bg-slate-900">
          {HERO_IMAGES.map((src, idx) => (
            <Image 
              key={src}
              src={src} 
              alt={`Rooma Ceritarasa Interior ${idx + 1}`} 
              fill 
              sizes="(max-width: 768px) 100vw, 896px"
              className={`object-cover transition-opacity duration-1000 ease-in-out ${
                idx === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
              priority={idx === 0}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
        </div>
      )}

      {/* 2. Title & Address */}
      {step !== 3 && (
        <div className="text-center mb-10 px-4">
          <Image
            src="/assets/logo_no_background.png"
            alt="Rooma Ceritarasa"
            width={160}
            height={80}
            className="mx-auto mb-4 h-16 w-auto object-contain drop-shadow-sm md:h-20"
            style={{ width: "auto" }}
          />
          <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Jl. Lawu No.4, Kotabaru, Kec. Gondokusuman, Kota Yogyakarta, DI Yogyakarta 55224
          </p>
        </div>
      )}

      {/* --- STEP 1: SELECTION --- */}
      {step === 1 && (
        <>
          {/* 3. Selection Pill */}
      <div className="w-full max-w-3xl flex flex-col md:flex-row bg-white border border-slate-200 shadow-sm overflow-hidden mb-8">
        {/* Guests Segment */}
        <button 
          onClick={() => setActiveModal("guests")}
          className="flex-1 px-6 py-4 md:py-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors border-b md:border-b-0 md:border-r border-slate-200 text-center"
        >
          <span className="text-xs uppercase tracking-widest text-slate-400 mb-1">Pax</span>
          <span className="text-base font-semibold text-slate-900">{partySize} Pax</span>
        </button>

        {/* Date Segment */}
        <button 
          onClick={() => setActiveModal("date")}
          className="flex-1 px-6 py-4 md:py-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors border-b md:border-b-0 md:border-r border-slate-200 text-center"
        >
          <span className="text-xs uppercase tracking-widest text-slate-400 mb-1">Date</span>
          <span className="text-base font-semibold text-slate-900">
            {selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: localeId }) : "Select Date"}
          </span>
        </button>

        {/* Session Segment */}
        <button 
          onClick={() => setActiveModal("time")}
          className={`flex-1 py-4 px-6 flex flex-col items-center justify-center transition-colors
            ${activeModal === "time" ? "bg-slate-50" : "bg-white hover:bg-slate-50"}
          `}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Session</span>
          <span className="font-semibold text-slate-900">
            {selectedSessionId 
              ? sessions.find(s => s.id === selectedSessionId)?.name 
              : "Select Session"}
          </span>
        </button>
      </div>

      {/* Modals Overlay (Amankila style) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-2 border-slate-900 w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="pt-6 pb-4 px-6 text-center border-b border-slate-100 relative">
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-semibold tracking-wide text-slate-900">Rooma Ceritarasa</h2>
              <p className="text-xs tracking-widest text-slate-500 mt-1">
                {activeModal === "guests" ? "Select Pax" : activeModal === "date" ? "Select Date" : "Select Session"}
              </p>
            </div>

            {/* Modal Content: Guests */}
            {activeModal === "guests" && (
              <div className="p-8">
                <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-100">
                  <button 
                    onClick={() => setPartySize(Math.max(1, partySize - 1))}
                    className="p-3 bg-white shadow-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 transition-all"
                    disabled={partySize <= 1}
                  >
                    <CaretLeft size={20} />
                  </button>
                  <div className="text-center">
                    <span className="block text-3xl font-semibold text-slate-900">{partySize}</span>
                    <span className="text-xs tracking-wider text-slate-500">pax</span>
                  </div>
                  <button 
                    onClick={() => setPartySize(partySize + 1)}
                    className="p-3 bg-white shadow-sm text-slate-600 hover:text-slate-900 transition-all"
                  >
                    <CaretRight size={20} />
                  </button>
                </div>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-6 py-4 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors border-2 border-slate-900"
                >
                  save
                </button>
              </div>
            )}

            {/* Modal Content: Date */}
            {activeModal === "date" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => {
                      const prev = subMonths(currentMonth, 1);
                      if (!isBefore(prev, startOfMonth(today))) {
                        setCurrentMonth(prev);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    disabled={isBefore(subMonths(currentMonth, 1), startOfMonth(today))}
                  >
                    <CaretLeft size={20} />
                  </button>
                  <div className="text-base font-semibold">
                    {format(currentMonth, "MMMM yyyy", { locale: localeId })}
                  </div>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 text-slate-500 hover:text-slate-900"
                  >
                    <CaretRight size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-7 mb-2">
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
                    <div key={day} className="text-center text-[10px] uppercase font-bold text-slate-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {loadingDates ? (
                  <div className="flex justify-center py-12"><CircleNotch size={24} className="animate-spin text-slate-300" /></div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {emptyDays.map(i => <div key={`empty-${i}`} className="p-2"></div>)}
                    {daysInMonth.map((day, idx) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const isPast = isBefore(day, today);
                      const isBlocked = blockedDates.has(dateStr);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isDisabled = isPast || isBlocked;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => handleDateSelect(day)}
                          disabled={isDisabled}
                          className={`
                            py-3 text-center text-sm font-medium transition-colors
                            ${isDisabled ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}
                            ${isSelected ? "bg-[#1f0609] text-white" : (!isDisabled && "hover:bg-slate-100 text-slate-700")}
                          `}
                        >
                          {format(day, "d")}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Modal Content: Time/Session */}
            {activeModal === "time" && (
              <div className="p-6">
                {!selectedDate ? (
                  <div className="text-center text-slate-500 py-8">
                    Silakan pilih tanggal terlebih dahulu.
                    <button 
                      onClick={() => setActiveModal("date")} 
                      className="block mx-auto mt-4 px-4 py-2 bg-slate-100 rounded-md text-sm text-slate-900"
                    >
                      Pilih Tanggal
                    </button>
                  </div>
                ) : loadingSessions ? (
                  <div className="flex justify-center py-12"><CircleNotch size={24} className="animate-spin text-slate-300" /></div>
                ) : sessions.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">Tidak ada sesi tersedia pada tanggal ini.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSelectedSessionId(session.id);
                          setSelectedTableIds([]);
                          setActiveModal(null); // Close modal and show results below pill
                        }}
                        className={`
                          py-4 px-6 flex justify-between items-center transition-all border
                          ${selectedSessionId === session.id 
                            ? "bg-[#1f0609] text-white border-[#1f0609]" 
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                          }
                        `}
                      >
                        <span className="font-semibold text-base">{session.name}</span>
                        <span className="text-sm opacity-80">
                          {new Date(session.startTime).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })} - {new Date(session.endTime).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Table Grid (Meimei style) */}
      <div className="w-full max-w-4xl px-4 mt-4">
        {!selectedDate || !selectedSessionId ? (
          <div className="text-center mt-8 space-y-4">
            <p className="text-slate-500 italic">
              Please select your preferred date and time to see available tables.
            </p>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              If you need any assistance with your reservation, please don&apos;t hesitate to <a href="https://wa.me/6285725539262" target="_blank" rel="noopener noreferrer" className="text-[#1f0609] font-medium underline underline-offset-2 hover:text-[#3a0d13] transition-colors">reach out to our dedicated reservations team</a>.
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-6 md:p-10 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h3 className="text-lg font-medium text-center text-slate-800 mb-2">
              Select your seating area
            </h3>
            <p className="text-sm text-center text-slate-500 mb-8 max-w-xl mx-auto">
              Please select your preferred seating area. For special occasions or private events, kindly contact our Reservations Team.
            </p>

            {loadingTables ? (
              <div className="flex justify-center py-12"><CircleNotch size={32} className="animate-spin text-slate-400" /></div>
            ) : tables.length === 0 ? (
              <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-100">
                Mohon maaf, tidak ada meja kosong untuk sesi ini.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {tables.map(table => {
                  const isSelected = selectedTableIds.includes(table.id);
                  return (
                    <button
                      key={table.id}
                      onClick={() => toggleTable(table.id)}
                      disabled={!table.isAvailable}
                      className={`
                        py-4 px-2 text-center transition-all flex flex-col items-center justify-center border-2
                        ${!table.isAvailable 
                          ? "bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed" // Abu-abu untuk terbooked
                          : isSelected 
                            ? "bg-slate-900 border-slate-900 text-white shadow-md" // Terpilih: hitam
                            : "bg-white border-slate-900 text-slate-900 hover:bg-slate-100" // Tersedia: putih border hitam
                        }
                      `}
                    >
                      <span className="font-bold text-sm md:text-base tracking-wide">
                        Table {table.tableNumber}
                      </span>
                      <span className="text-[10px] md:text-xs mt-1 opacity-80 uppercase tracking-widest">
                        Cap: {table.capacity}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Continue Button for Table Selection */}
            {selectedTableIds.length > 0 && (
              <div className="mt-10 flex flex-col items-center animate-in fade-in duration-300">
                {tables.filter(t => selectedTableIds.includes(t.id)).reduce((acc, t) => acc + t.capacity, 0) < partySize ? (
                  <p className="text-red-600 font-semibold mb-4 text-center">
                    Kapasitas meja belum cukup untuk {partySize} Pax. <br/>
                    Silakan pilih meja tambahan.
                  </p>
                ) : (
                  <>
                    {partySize === 2 && selectedDate && (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) && (
                      <div className="mb-8 w-full max-w-md flex items-start gap-4 rounded-2xl bg-[#fcfbf9] border border-amber-200/60 p-5 shadow-sm animate-in fade-in duration-500">
                        <Info size={24} weight="fill" className="text-amber-600 shrink-0" />
                        <div className="text-left">
                          <p className="text-xs uppercase tracking-[0.25em] font-semibold text-amber-800 mb-1">
                            Deposit Information
                          </p>
                          <p className="text-sm leading-relaxed text-slate-600">
                            Khusus reservasi akhir pekan untuk 2 pax akan dikenakan deposit sebesar <span className="font-semibold text-slate-900">Rp 75.000</span> pada tahap pembayaran.
                          </p>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => setStep(2)}
                      className="px-12 py-4 bg-[#1f0609] text-white font-semibold uppercase tracking-widest hover:bg-[#3a0d13] hover:shadow-lg transition-all"
                    >
                      Continue Request
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* --- STEP 2: GUEST FORM --- */}
      {step === 2 && selectedDate && selectedSessionId && (
        <div ref={formRef} className="w-full px-4 mt-4 mb-20 animate-in fade-in duration-500">
          <GuestReservationForm
            date={selectedDate}
            sessionId={selectedSessionId}
            tableIds={selectedTableIds}
            guestCount={partySize}
            vipToken={vipToken || undefined}
            onSuccess={handleReservationSuccess}
            onBack={() => setStep(1)}
          />
        </div>
      )}

      {/* --- STEP 3: SUCCESS --- */}
      {step === 3 && (
         <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[60vh] py-10 px-4">
           <div className="w-full max-w-2xl bg-white border-2 border-slate-900 p-10 md:p-16 text-center shadow-sm animate-in zoom-in-95 duration-500">
             
             <div className="relative inline-flex items-center justify-center mb-8 w-24 h-24">
               {/* Main icon without pop/ripple animation */}
               <CheckCircle size={80} weight="fill" className="text-[#1f0609] relative z-10" />
             </div>
             
             <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-4 text-slate-900 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
               {paymentState === "paid"
                 ? "Payment Received"
                 : paymentState === "not_required"
                 ? "Reservation Sent"
                 : "Complete Your Deposit"}
             </h2>
             <p className="text-slate-600 mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
               {paymentState === "paid"
                 ? "Pembayaran deposit Anda sudah diterima. Tim kami akan mengonfirmasi detail reservasi melalui WhatsApp."
                 : paymentState === "not_required"
                 ? "Reservasi Anda tidak memerlukan deposit. Tim kami akan segera menghubungi Anda melalui WhatsApp."
                 : "Reservasi sudah tercatat. Selesaikan pembayaran deposit melalui Midtrans agar reservasi dapat dikonfirmasi."}
             </p>

             <div className="mb-8 border-y border-slate-200 py-5 text-left animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
               <div className="grid gap-4 text-sm md:grid-cols-2">
                 <div>
                   <p className="text-xs uppercase tracking-widest text-slate-400">
                     Reservation ID
                   </p>
                   <p className="mt-1 break-all font-semibold text-slate-900">
                     {reservationResult?.reservationId ?? "-"}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs uppercase tracking-widest text-slate-400">
                     Deposit
                   </p>
                   <p className="mt-1 font-semibold text-slate-900">
                     {paymentResult
                       ? formatRupiah(paymentResult.amount)
                       : paymentState === "creating"
                       ? "Menyiapkan pembayaran"
                       : "-"}
                   </p>
                 </div>
               </div>

               {paymentResult?.minimumOrder ? (
                 <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                   Minimum order untuk reservasi ini:{" "}
                   {formatRupiah(paymentResult.minimumOrder)}.
                 </p>
               ) : null}

               {paymentError ? (
                 <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                   {paymentError}
                 </p>
               ) : null}

               {paymentState === "pending" ? (
                 <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                   Pembayaran sedang menunggu penyelesaian. Ikuti instruksi dari
                   Midtrans sampai selesai.
                 </p>
               ) : null}
             </div>

             <div className="flex flex-col gap-3 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
               {paymentResult?.paymentRequired && paymentResult.token ? (
                 <button
                   type="button"
                   onClick={() => openSnapPayment(paymentResult.token!)}
                   disabled={!snapReady || paymentState === "creating"}
                   className="px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                 >
                   {paymentState === "paid" ? "Lihat Pembayaran" : "Bayar Deposit"}
                 </button>
               ) : null}
               <button onClick={() => window.location.href = '/'} className="px-8 py-4 border-2 border-slate-900 text-slate-900 font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">
                 Kembali ke Beranda
               </button>
             </div>
           </div>
         </div>
      )}

    </div>
  );
}
