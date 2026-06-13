"use client";

import { useEffect, useState } from "react";
import { Plus, Clock, Users, CalendarBlank, Trash } from "@phosphor-icons/react";

type SessionData = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isActive: boolean;
  dayOfWeek: number[];
};

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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
      const res = await fetch("/api/admin/sessions", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || payload.message || "Gagal memuat sesi");
      
      setSessions(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
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
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus sesi. Mungkin ada reservasi aktif.");
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
      setError("Mohon lengkapi semua field dan pilih minimal satu hari.");
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
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Gagal ${editSessionId ? 'mengubah' : 'menambah'} sesi`);
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
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Setup Restoran</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Sesi Operasional</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Atur jam buka operasional per sesi (misal: Sesi Siang, Sesi Malam) agar tamu dapat memilih waktu reservasi dengan tepat.
          </p>
        </div>
        <div>
          <button
            onClick={() => { resetForm(); setIsAdding(!isAdding); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
          >
            <Plus weight="bold" />
            Tambah Sesi
          </button>
        </div>
      </header>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

      {isAdding && (
        <form onSubmit={handleAddSession} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-slate-900">{editSessionId ? "Edit Sesi Operasional" : "Tambah Sesi Baru"}</h2>
            {editSessionId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <span className="text-sm font-semibold text-slate-700">Sesi Aktif</span>
              </label>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nama Sesi</label>
              <input 
                type="text" required 
                placeholder="Misal: Sesi Siang"
                value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Kapasitas Maksimal (Pax)</label>
              <input 
                type="number" required min="1"
                placeholder="Misal: 50"
                value={newCapacity} onChange={e => setNewCapacity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Jam Mulai</label>
              <input 
                type="time" required
                value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Jam Selesai</label>
              <input 
                type="time" required
                value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Berlaku Pada Hari</label>
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
            <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm disabled:opacity-50">
              {isSaving ? "Menyimpan..." : (editSessionId ? "Simpan Perubahan" : "Simpan Sesi")}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Memuat data sesi...</div>
      ) : sessions.length === 0 && !isAdding ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <CalendarBlank size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Belum ada sesi</h3>
          <p className="text-slate-500 text-sm">Tambahkan sesi operasional pertama Anda untuk mulai menerima reservasi.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900">{session.name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {session.isActive ? 'Aktif' : 'Non-Aktif'}
                </span>
              </div>
              
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock size={16} className="text-slate-400" />
                  <span className="font-medium">{session.startTime} - {session.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users size={16} className="text-slate-400" />
                  <span className="font-medium">Maks. {session.maxCapacity} Pax</span>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Hari Aktif</p>
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
                  Hapus
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Sesi</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Apakah Anda yakin ingin menghapus sesi <span className="font-bold text-slate-900">{deleteSessionId.name}</span>? 
                Aksi ini tidak dapat dibatalkan dan akan ditolak jika ada reservasi yang terkait.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteSessionId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isSaving ? "Memproses..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
