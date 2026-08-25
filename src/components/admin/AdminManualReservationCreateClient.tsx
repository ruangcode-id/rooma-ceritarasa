"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { handleApiError } from "@/lib/handle-api-error";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";

type Session = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

type Table = {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
};

/** Converts raw tableNumber to a human-readable label.
 * Examples: "OUT-1" → "Out Table 1", "Table 1" → "Table 1", "TT1" → "TT1"
 */
function formatTableName(tableNumber: string): string {
  const outMatch = tableNumber.match(/^OUT-?(\d+)$/i);
  if (outMatch) return `Out Table ${outMatch[1]}`;
  return tableNumber;
}

export default function AdminManualReservationCreateClient() {
  const router = useRouter();
  
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [sessionId, setSessionId] = useState<string>("");
  const [partySize, setPartySize] = useState<number | "">("");
  const [tableIds, setTableIds] = useState<string[]>([]);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch Sessions
  useEffect(() => {
    if (!date) return;
    setLoadingSessions(true);
    setSessionId("");
    setTableIds([]);
    setTables([]);
    
    fetch(`/api/public/sessions?date=${date}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessions(data.data);
          if (data.data.length > 0) setSessionId(data.data[0].id);
        } else {
          setSessions([]);
        }
      })
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  }, [date]);

  // Fetch Tables
  useEffect(() => {
    if (!date || !sessionId) return;
    setLoadingTables(true);
    setTableIds([]);
    
    fetch(`/api/public/tables?date=${date}&sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const sorted = [...(data.data as Table[])].sort((a, b) =>
            a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: "base" })
          );
          setTables(sorted);
        } else {
          setTables([]);
        }
      })
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [date, sessionId]);

  const toggleTable = (id: string) => {
    setTableIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tableIds.length === 0) {
      setError("Please select at least one table.");
      return;
    }
    
    setError("");
    setSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      date,
      sessionId,
      tableIds,
      partySize: Number(formData.get("partySize")),
      guestName: formData.get("guestName"),
      guestPhone: formData.get("guestPhone")?.toString().replace(/\D/g, ''),
      guestEmail: formData.get("guestEmail"),
      specialRequest: formData.get("specialRequest"),
    };

    try {
      const res = await fetch("/api/admin/manual-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorMsg = await handleApiError(res);
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/admin/manual-reservations");
          router.refresh();
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to create reservation.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle size={64} className="text-green-500" weight="fill" />
        <h2 className="text-2xl font-bold text-slate-900">Reservation Created</h2>
        <p className="text-slate-600">The manual reservation has been saved successfully.</p>
        <p className="text-sm text-slate-400">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative max-w-4xl mx-auto">
      <header className="flex items-center gap-4">
        <Link href="/admin/manual-reservations" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <SectionTitle
          eyebrow="Manual Entry"
          title="Create Manual Reservation"
          level={1}
          description="Input reservation from WhatsApp or phone call."
        />
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Reservation Details</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Session *</label>
              <select
                required
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={loadingSessions || sessions.length === 0}
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
              >
                {loadingSessions ? (
                  <option value="">Loading...</option>
                ) : sessions.length === 0 ? (
                  <option value="">No sessions available</option>
                ) : (
                  sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Party Size (Pax) *</label>
              <input
                type="number"
                name="partySize"
                required
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-8">
            <label className="block text-sm font-bold text-slate-700 mb-4">Select Tables *</label>
            {loadingTables ? (
              <p className="text-sm text-slate-500">Loading tables...</p>
            ) : tables.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">No tables found or select session first.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tables.map(table => {
                  const isSelected = tableIds.includes(table.id);
                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={!table.isAvailable}
                      onClick={() => toggleTable(table.id)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold ${
                        !table.isAvailable 
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                          : isSelected
                            ? "border-primary bg-primary text-white shadow-md scale-105"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-bold">{formatTableName(table.tableNumber)}</span>
                      <span className="text-xs font-normal opacity-80 block">{table.capacity} Pax</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Guest Information</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="guestName"
                required
                placeholder="John Doe"
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp Number *</label>
              <input
                type="tel"
                name="guestPhone"
                required
                placeholder="081234567890"
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email (Optional)</label>
              <input
                type="email"
                name="guestEmail"
                placeholder="john@example.com"
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Special Request (Optional)</label>
            <textarea
              name="specialRequest"
              rows={3}
              placeholder="Allergies, high chair needed, etc."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait"
          >
            {submitting ? "Processing..." : "Create Reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}
