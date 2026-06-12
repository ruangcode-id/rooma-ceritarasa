"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CaretLeft, CaretRight, X, CircleNotch, CheckCircle } from "@phosphor-icons/react";
import Image from "next/image";
import { GuestReservationForm } from "../forms/GuestReservationForm";

interface BlockedDate {
  date: string;
}

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

const HERO_IMAGES = [
  "/assets/slider1.webp",
  "/assets/slider2.webp",
  "/assets/slider3.webp",
  "/assets/slider4.webp",
  "/assets/slider5.webp",
  "/assets/slider6.webp",
];

type ModalType = "guests" | "date" | "time" | null;

export default function ReservationWizard() {
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
        const data = await res.json();
        
        if (data.success) {
          const blocked = new Set<string>();
          data.data.forEach((b: BlockedDate) => {
            blocked.add(b.date.split("T")[0]);
          });
          setBlockedDates(blocked);
        }
      } catch (err) {
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
      } catch (err) {
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
      } catch (err) {
        console.error("Failed to fetch tables");
      } finally {
        setLoadingTables(false);
      }
    }
    fetchTables();
  }, [selectedDate, selectedSessionId]);

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

  const isFormComplete = selectedDate && selectedSessionId && selectedTableIds.length > 0;

  // --- Calendar Helpers ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="flex flex-col items-center w-full relative">
      
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
          <img 
            src="/assets/logo_no_background.png" 
            alt="Rooma Ceritarasa" 
            className="h-16 md:h-20 w-auto object-contain mx-auto mb-4 drop-shadow-sm"
          />
          <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Jl. Lawu No.2, Kotabaru, Kec. Gondokusuman, Kota Yogyakarta, DI Yogyakarta 55224
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
          <span className="text-xs uppercase tracking-widest text-slate-400 mb-1">Guests</span>
          <span className="text-base font-semibold text-slate-900">{partySize} Guests</span>
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
              <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">
                {activeModal === "guests" ? "Select Guests" : activeModal === "date" ? "Select Date" : "Select Session"}
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
                    <span className="text-xs uppercase tracking-wider text-slate-500">Guests</span>
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
                  className="w-full mt-6 py-4 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                >
                  Save
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
          <p className="text-center text-slate-500 italic mt-8">
            Please select your preferred date and time to see available tables.
          </p>
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
                    Kapasitas meja belum cukup untuk {partySize} Guests. <br/>
                    Silakan pilih meja tambahan.
                  </p>
                ) : (
                  <button 
                    onClick={() => setStep(2)}
                    className="px-12 py-4 bg-[#1f0609] text-white font-semibold uppercase tracking-widest hover:bg-[#3a0d13] hover:shadow-lg transition-all"
                  >
                    Continue Request
                  </button>
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
        <div className="w-full px-4 mt-4 mb-20 animate-in fade-in duration-500">
          <GuestReservationForm
            date={selectedDate}
            sessionId={selectedSessionId}
            tableIds={selectedTableIds}
            guestCount={partySize}
            onSuccess={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        </div>
      )}

      {/* --- STEP 3: SUCCESS --- */}
      {step === 3 && (
         <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[60vh] py-10 px-4">
           <div className="w-full max-w-2xl bg-white border-2 border-slate-900 p-10 md:p-16 text-center shadow-sm animate-in zoom-in-95 duration-500">
             <CheckCircle size={64} weight="fill" className="mx-auto mb-6 text-[#1f0609]" />
             <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-4 text-slate-900">Reservation Sent!</h2>
             <p className="text-slate-600 mb-10 leading-relaxed">
               Terima kasih atas permintaan reservasi Anda. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk mengonfirmasi ketersediaan dan detail pesanan.
             </p>
             <button onClick={() => window.location.href = '/'} className="px-8 py-4 border-2 border-slate-900 text-slate-900 font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">
               Kembali ke Beranda
             </button>
           </div>
         </div>
      )}

    </div>
  );
}
