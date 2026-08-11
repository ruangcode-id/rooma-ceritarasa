"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isBefore, startOfDay, parseISO, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { CaretLeft, CaretRight, Prohibit, CalendarX, Sparkle, Trash, Plus } from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type BlockedDate = {
  id: string;
  date: string; // ISO string
  reason: string | null;
  createdBy: string;
};

type SpecialOpenDate = {
  id: string;
  date: string;
  reason: string | null;
  createdBy: string | null;
};

async function fetchBlockedDates(signal?: AbortSignal): Promise<BlockedDate[]> {
  const res = await fetch("/api/admin/blocked-dates", {
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(await handleApiError(res));

  const payload = await res.json();
  if (!payload.success) throw new Error(payload.error || "Failed to load blocked dates");

  return payload.data || [];
}

async function fetchSpecialOpenDates(signal?: AbortSignal): Promise<SpecialOpenDate[]> {
  const res = await fetch("/api/admin/special-open-dates", {
    cache: "no-store",
    signal,
  });
  if (!res.ok) return [];

  const payload = await res.json();
  if (!payload.success) return [];

  return payload.data || [];
}

export default function AdminBlockedDatesClient() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [specialOpenDates, setSpecialOpenDates] = useState<SpecialOpenDate[]>([]);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State for Block Date
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState("");
  
  // Unblock State
  const [unblockDialog, setUnblockDialog] = useState<BlockedDate | null>(null);

  // Special Monday Opening Modal State
  const [showAddSpecialMonday, setShowAddSpecialMonday] = useState(false);
  const [specialMondayDate, setSpecialMondayDate] = useState("");
  const [specialMondayReason, setSpecialMondayReason] = useState("");
  const [deleteSpecialOpenDialog, setDeleteSpecialOpenDialog] = useState<SpecialOpenDate | null>(null);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [blocked, special] = await Promise.all([
        fetchBlockedDates(),
        fetchSpecialOpenDates(),
      ]);
      setBlockedDates(blocked);
      setSpecialOpenDates(special);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      fetchBlockedDates(controller.signal),
      fetchSpecialOpenDates(controller.signal),
    ])
      .then(([blocked, special]) => {
        if (!controller.signal.aborted) {
          setBlockedDates(blocked);
          setSpecialOpenDates(special);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => controller.abort();
  }, []);

  const handleToggleBlock = (date: Date) => {
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
      void loadData();
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
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const submitSpecialMonday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialMondayDate) return;

    const chosenDate = parseISO(specialMondayDate);
    if (getDay(chosenDate) !== 1) {
      setError("Please select a valid Monday date.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/special-open-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: specialMondayDate,
          reason: specialMondayReason || "Special Holiday Opening",
        }),
      });

      if (!res.ok) throw new Error(await handleApiError(res));
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to add special Monday opening.");
      }

      setShowAddSpecialMonday(false);
      setSpecialMondayDate("");
      setSpecialMondayReason("");
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const executeDeleteSpecialOpen = async () => {
    if (!deleteSpecialOpenDialog) return;
    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/special-open-dates/${deleteSpecialOpenDialog.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await handleApiError(res));

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete special opening.");

      setDeleteSpecialOpenDialog(null);
      void loadData();
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

  const startDay = daysInMonth[0].getDay();
  const paddingDays = Array.from({ length: startDay }).map((_, i) => i);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Restaurant Setup</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Holiday & Operating Calendar</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Manage closed restaurant dates and configure special Monday openings for holidays or events.
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
              const isSpecialOpen = specialOpenDates.find(s => s.date.startsWith(dateStr));
              const isMonday = getDay(date) === 1;
              const isPast = isBefore(date, startOfDay(new Date()));
              const isTodayDate = isToday(date);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleToggleBlock(date)}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-xl border transition-all duration-200
                    ${isSpecialOpen
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                      : isBlocked 
                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                        : isMonday
                          ? 'bg-rose-50/50 border-rose-100 text-rose-600'
                          : isPast
                            ? 'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed'
                            : 'bg-white border-slate-100 hover:border-primary hover:shadow-sm text-slate-700'
                    }
                  `}
                >
                  <span className={`text-lg font-bold ${isTodayDate && !isBlocked ? 'text-primary' : ''}`}>
                    {format(date, "d")}
                  </span>
                  {isSpecialOpen ? (
                    <span className="absolute bottom-1 text-[8px] font-extrabold text-emerald-700 uppercase tracking-tighter bg-emerald-200/60 px-1 rounded">
                      OPEN
                    </span>
                  ) : isBlocked ? (
                    <span className="absolute bottom-2">
                      <Prohibit weight="bold" className="text-red-500" />
                    </span>
                  ) : isMonday && !isPast ? (
                    <span className="absolute bottom-1 text-[8px] font-bold text-rose-400 uppercase tracking-tighter">
                      CLOSED
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Special Monday Openings Card Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Sparkle size={18} weight="fill" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Special Monday Openings</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              By default, the restaurant is closed every Monday. Register specific Monday dates below to open reservations for holidays or special events.
            </p>
          </div>

          <button
            onClick={() => {
              setSpecialMondayDate("");
              setSpecialMondayReason("");
              setShowAddSpecialMonday(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={16} weight="bold" />
            <span>Open Special Monday</span>
          </button>
        </div>

        {specialOpenDates.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No special Monday openings registered. All Mondays follow standard closed schedule.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Monday Date</th>
                  <th className="py-2.5 px-3">Reason / Note</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specialOpenDates.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {format(parseISO(item.date), "EEEE, MMMM do, yyyy", { locale: enUS })}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {item.reason || "Special Opening"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setDeleteSpecialOpenDialog(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors"
                        title="Remove Special Opening"
                      >
                        <Trash size={14} weight="bold" />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Add Special Monday Opening Modal */}
      {showAddSpecialMonday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Sparkle size={24} weight="bold" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Open Special Monday</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Select a Monday date to open reservations for guests.
              </p>

              <form onSubmit={submitSpecialMonday} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Select Monday Date</label>
                  <input
                    type="date"
                    required
                    value={specialMondayDate}
                    onChange={(e) => setSpecialMondayDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Reason / Event (Optional)</label>
                  <input
                    type="text"
                    placeholder="Example: Independence Day, Special Event"
                    value={specialMondayReason}
                    onChange={(e) => setSpecialMondayReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSpecialMonday(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Open Monday"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Special Open Modal */}
      {deleteSpecialOpenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Revert Monday to Closed</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Remove special opening for <span className="font-bold text-slate-900">{format(parseISO(deleteSpecialOpenDialog.date), "EEEE, MMMM do, yyyy", { locale: enUS })}</span>? This Monday will revert to normal closed status.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteSpecialOpenDialog(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteSpecialOpen}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isUpdating ? "Processing..." : "Revert to Closed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
