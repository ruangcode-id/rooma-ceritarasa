"use client";

import { useState, useEffect } from "react";

type Session = {
  id: string;
  name: string;
  maxCapacity: number;
};

type Table = {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
};

export default function TestReservationPage() {
  const [date, setDate] = useState("2026-12-25");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [form, setForm] = useState({
    guestName: "Budi Santoso",
    guestPhone: "08123456789",
    guestEmail: "",
    partySize: 2,
    specialRequest: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!date) return;
    fetch(`/api/public/sessions?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setSessions(d.data); setSelectedSession(""); setTables([]); }
      });
  }, [date]);

  useEffect(() => {
    if (!date || !selectedSession) return;
    fetch(`/api/public/tables?date=${date}&sessionId=${selectedSession}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTables(d.data); });
  }, [date, selectedSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("⏳ Loading...");
    const res = await fetch("/api/public/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sessionId: selectedSession, tableId: selectedTable, date }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setMessage(`✅ Sukses!\nReservation ID: ${data.data.reservationId}\nExpires At: ${new Date(data.data.expiresAt).toLocaleString("id-ID")}`);
      fetch(`/api/public/tables?date=${date}&sessionId=${selectedSession}`).then((r) => r.json()).then((d) => setTables(d.data));
    } else {
      setMessage(`❌ Error: ${data.error || JSON.stringify(data)}`);
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px" }}>🧪 Testing: Public Reservation</h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>Simulasi tamu memilih meja & membuat reservasi</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "6px" }}>Tanggal</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
        </div>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "6px" }}>Sesi</label>
          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }}>
            <option value="">-- Pilih Sesi --</option>
            {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name} (Max: {s.maxCapacity})</option>))}
          </select>
        </div>
      </div>

      {selectedSession && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "20px", background: "#f9fafb" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>Pilih Meja</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            {tables.map((t) => (
              <div key={t.id} onClick={() => t.isAvailable && setSelectedTable(t.id)}
                style={{
                  padding: "12px", borderRadius: "8px", textAlign: "center", cursor: t.isAvailable ? "pointer" : "not-allowed",
                  border: selectedTable === t.id ? "2px solid #2563eb" : "1px solid #d1d5db",
                  background: !t.isAvailable ? "#fee2e2" : selectedTable === t.id ? "#dbeafe" : "#fff",
                  color: !t.isAvailable ? "#b91c1c" : selectedTable === t.id ? "#1d4ed8" : "#374151",
                }}>
                <div style={{ fontWeight: "bold" }}>{t.tableNumber}</div>
                <div style={{ fontSize: "12px" }}>Kap: {t.capacity}</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>{t.isAvailable ? "✅ Tersedia" : "🔒 Terisi"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTable && (
        <form onSubmit={handleSubmit} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>Detail Tamu</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { placeholder: "Nama Lengkap", key: "guestName" },
              { placeholder: "Nomor HP", key: "guestPhone" },
              { placeholder: "Email (opsional)", key: "guestEmail" },
            ].map(({ placeholder, key }) => (
              <input key={key} placeholder={placeholder} value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            ))}
            <input type="number" min="1" placeholder="Jumlah Orang" value={form.partySize}
              onChange={(e) => setForm({ ...form, partySize: parseInt(e.target.value) })}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <textarea placeholder="Catatan khusus" value={form.specialRequest}
              onChange={(e) => setForm({ ...form, specialRequest: e.target.value })}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px", gridColumn: "span 2" }} />
          </div>
          <button type="submit" style={{ marginTop: "14px", background: "#16a34a", color: "#fff", padding: "10px 24px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            Pesan Sekarang
          </button>
        </form>
      )}

      {message && (
        <pre style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", fontSize: "13px", whiteSpace: "pre-wrap" }}>
          {message}
        </pre>
      )}

      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <a href="/test-admin" style={{ color: "#2563eb", fontSize: "14px" }}>→ Buka halaman Testing Admin</a>
      </div>
    </div>
  );
}
