"use client";

import { useEffect, useState } from "react";
import { Plus, Clock, Users, CalendarBlank } from "@phosphor-icons/react";
import { handleApiError } from "@/lib/handle-api-error";

type SessionData = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isActive: boolean;
  dayOfWeek: number[];
};

type SessionsResponse = {
  success: boolean;
  data?: SessionData[];
  error?: string;
  message?: string;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function fetchSessions(signal?: AbortSignal): Promise<SessionData[]> {
  const res = await fetch("/api/admin/sessions", {
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(await handleApiError(res));

  const payload: SessionsResponse = await res.json();
  if (!payload.success) throw new Error(payload.error || payload.message || "Failed to load sessions");

  return (payload.data ?? []).map((session) => ({
    ...session,
    startTime: typeof session.startTime === "string" ? session.startTime.substring(11, 16) : session.startTime,
    endTime: typeof session.endTime === "string" ? session.endTime.substring(11, 16) : session.endTime,
  }));
}

export default function AdminSessionsClient() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<SessionData | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);

  async function loadSessions() {
    setIsLoading(true);
    setError("");
    try {
      setSessions(await fetchSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    void fetchSessions(controller.signal)
      .then((loadedSessions) => {
        if (!controller.signal.aborted) setSessions(loadedSessions);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setIsAdding(false);
    setEditSessionId(null);
    setNewName("");
    setNewStartTime("");
    setNewEndTime("");
    setNewCapacity("");
    setNewDays([]);
    setIsActive(true);
  };

  const handleEditClick = (session: SessionData) => {
    setNewName(session.name);
    setNewStartTime(session.startTime);
    setNewEndTime(session.endTime);
    setNewCapacity(String(session.maxCapacity));
    setNewDays(session.dayOfWeek);
    setIsActive(session.isActive);
    setEditSessionId(session.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const executeDelete = async () => {
    if (!deleteSessionId) return;
    
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sessions/${deleteSessionId.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorMsg = await handleApiError(res);
        throw new Error(errorMsg);
      }
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to delete session. There might be active reservations.");
      }
      
      setDeleteSessionId(null);
      void loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setNewDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newStartTime || !newEndTime || !newCapacity || newDays.length === 0) {
      setError("Please fill all fields and select at least one day.");
      return;
    }
    
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        name: newName,
        startTime: newStartTime,
        endTime: newEndTime,
        maxCapacity: parseInt(newCapacity),
        isActive: isActive,
        dayOfWeek: newDays,
      };

      const url = editSessionId ? `/api/admin/sessions/${editSessionId}` : "/api/admin/sessions";
      const method = editSessionId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorMsg = await handleApiError(res);
        throw new Error(errorMsg);
      }
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || data.message || `Failed to ${editSessionId ? 'update' : 'add'} session`);
      }
      
      resetForm();
      void loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Restaurant Setup</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Operational Sessions</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Manage operational hours per session (e.g., Lunch Session, Dinner Session) so guests can choose appropriate reservation times.
          </p>
        </div>
        <div>
          <button
            onClick={() => { resetForm(); setIsAdding(!isAdding); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
          >
            <Plus weight="bold" />
            Add Session
          </button>
        </div>
      </header>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

      {isAdding && (
        <form onSubmit={handleAddSession} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-slate-900">{editSessionId ? "Edit Operational Session" : "Add New Session"}</h2>
            {editSessionId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <span className="text-sm font-semibold text-slate-700">Active Session</span>
              </label>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Session Name</label>
              <input 
                type="text" required 
                placeholder="Example: Lunch Session"
                value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Maximum Capacity (Pax)</label>
              <input 
                type="number" required min="1"
                placeholder="Example: 50"
                value={newCapacity} onChange={e => setNewCapacity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Start Time</label>
              <input 
                type="time" required
                value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">End Time</label>
              <input 
                type="time" required
                value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Available On Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                    newDays.includes(idx) 
                      ? 'bg-primary border-primary text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm disabled:opacity-50">
              {isSaving ? "Saving..." : (editSessionId ? "Save Changes" : "Save Session")}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading session data...</div>
      ) : sessions.length === 0 && !isAdding ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <CalendarBlank size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No sessions yet</h3>
          <p className="text-slate-500 text-sm">Add your first operational session to start accepting reservations.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900">{session.name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {session.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock size={16} className="text-slate-400" />
                  <span className="font-medium">{session.startTime} - {session.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users size={16} className="text-slate-400" />
                  <span className="font-medium">Max. {session.maxCapacity} Pax</span>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Days</p>
                <div className="flex flex-wrap gap-1">
                  {session.dayOfWeek.sort().map(d => (
                    <span key={d} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                      {DAYS[d]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => handleEditClick(session)}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => setDeleteSessionId(session)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Session</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Are you sure you want to delete session <span className="font-bold text-slate-900">{deleteSessionId.name}</span>? 
                This action cannot be undone and will be rejected if there are related reservations.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteSessionId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isSaving ? "Processing..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
