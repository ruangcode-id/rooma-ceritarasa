"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isBefore, startOfDay, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { CaretLeft, CaretRight, Prohibit, CalendarX } from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type BlockedDate = {
  id: string;
  date: string; // ISO string
  reason: string | null;
  createdBy: string;
};

export default function AdminBlockedDatesClient() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState("");
  
  // Unblock State
  const [unblockDialog, setUnblockDialog] = useState<BlockedDate | null>(null);

  async function loadBlockedDates() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blocked-dates", { cache: "no-store" });
      if (!res.ok) throw new Error(await handleApiError(res));

      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error || "Failed to load blocked dates");
      
      setBlockedDates(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBlockedDates();
  }, []);

  const handleToggleBlock = (date: Date) => {
    // Jangan izinkan blokir tanggal yang sudah lewat
    if (isBefore(date, startOfDay(new Date()))) {
      setError("Cannot change the status of past dates.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = blockedDates.find(b => b.date.startsWith(dateStr));
    
    if (existing) {
      setUnblockDialog(existing);
    } else {
      setSelectedDate(date);
      setBlockReason("");
    }
  };

  const submitBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setIsUpdating(true);
    setError("");
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const payload = {
        date: dateStr,
        reason: blockReason || "Closed",
      };

      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to block date. Make sure there are no active reservations.");
      }
      
      setSelectedDate(null);
      void loadBlockedDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const executeUnblockDate = async () => {
    if (!unblockDialog) return;
    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/blocked-dates/${unblockDialog.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to unblock date.");
      }
      
      setUnblockDialog(null);
      void loadBlockedDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Calculate empty padding days for the first row of calendar (Sunday = 0, Monday = 1, etc.)
  const startDay = daysInMonth[0].getDay();
  const paddingDays = Array.from({ length: startDay }).map((_, i) => i);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Restaurant Setup</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Holiday Calendar</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Select dates to close the restaurant. Blocked dates cannot be chosen by guests during reservation.
          </p>
        </div>
      </header>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: enUS })}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <CaretLeft weight="bold" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <CaretRight weight="bold" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-px mb-2">
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {paddingDays.map(pad => (
              <div key={`pad-${pad}`} className="aspect-square rounded-xl bg-slate-50/50" />
            ))}

            {daysInMonth.map(date => {
              const dateStr = format(date, "yyyy-MM-dd");
              const isBlocked = blockedDates.find(b => b.date.startsWith(dateStr));
              const isPast = isBefore(date, startOfDay(new Date()));
              const isTodayDate = isToday(date);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleToggleBlock(date)}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-xl border transition-all duration-200
                    ${isBlocked 
                      ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                      : isPast
                        ? 'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-100 hover:border-primary hover:shadow-sm text-slate-700'
                    }
                  `}
                >
                  <span className={`text-lg font-bold ${isTodayDate && !isBlocked ? 'text-primary' : ''}`}>
                    {format(date, "d")}
                  </span>
                  {isBlocked && (
                    <span className="absolute bottom-2">
                      <Prohibit weight="bold" className="text-red-500" />
                    </span>
                  )}
                  {isTodayDate && !isBlocked && (
                    <span className="absolute bottom-2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Block Date Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <CalendarX size={24} weight="bold" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Block Date</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                You are about to close the restaurant on <span className="font-bold text-slate-900">{format(selectedDate, "MMMM do, yyyy", { locale: enUS })}</span>. Guests will not be able to make reservations.
              </p>
              
              <form onSubmit={submitBlockDate}>
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Reason (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Example: Renovation, National Holiday"
                    value={blockReason} onChange={e => setBlockReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                  >
                    {isUpdating ? "Processing..." : "Yes, Block Date"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Date Modal */}
      {unblockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Unblock Date</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Are you sure you want to reopen the restaurant on <span className="font-bold text-slate-900">{format(parseISO(unblockDialog.date), "MMMM do, yyyy", { locale: enUS })}</span>? Guests will be able to make reservations again.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setUnblockDialog(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeUnblockDate}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50"
                >
                  {isUpdating ? "Processing..." : "Yes, Unblock Date"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
