"use client";

import { useState } from "react";

type Reservation = {
  id: string;
  status: string;
  date: string;
  partySize: number;
  specialRequest?: string;
  createdAt: string;
  guest: { id: string; name: string; phone: string };
  session: { id: string; name: string; startTime: string };
  reservationTables: Array<{ table: { tableNumber: string; capacity: number } }>;
};

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type AvailableTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#16a34a",
  checked_in: "#2563eb",
  no_show: "#9ca3af",
  cancelled: "#dc2626",
};

const STATUS_OPTIONS = ["", "pending", "confirmed", "checked_in", "no_show", "cancelled"];

export default function TestAdminPage() {
  // ── Section 1: List ──
  const [filters, setFilters] = useState({ date: "", status: "", sessionId: "", search: "", page: "1" });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [listMessage, setListMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Section 2: Update Status ──
  const [patchId, setPatchId] = useState("");
  const [patchStatus, setPatchStatus] = useState("confirmed");
  const [patchMessage, setPatchMessage] = useState("");

  // ── Section 3: Ganti Meja ──
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [tableMessage, setTableMessage] = useState("");
  const [loadingTables, setLoadingTables] = useState(false);

  const fetchReservations = async (page = "1") => {
    setLoading(true);
    setListMessage("");
    const params = new URLSearchParams();
    if (filters.date) params.set("date", filters.date);
    if (filters.status) params.set("status", filters.status);
    if (filters.sessionId) params.set("sessionId", filters.sessionId);
    if (filters.search) params.set("search", filters.search);
    params.set("page", page);
    params.set("limit", "5");

    const res = await fetch(`/api/admin/reservations?${params.toString()}`);
    const data = await res.json();
    setLoading(false);

    if (res.ok && data.success) {
      setReservations(data.data);
      setMeta(data.meta);
    } else {
      setListMessage(`❌ Error: ${data.error || res.status + " " + res.statusText}`);
      setReservations([]);
      setMeta(null);
    }
  };

  const handleRowClick = async (r: Reservation) => {
    // Set reservation ID untuk section 2
    setPatchId(r.id);
    setPatchMessage("");

    // Set selected reservation untuk section 3, dan fetch meja yang tersedia
    setSelectedReservation(r);
    setSelectedTableIds(r.reservationTables.map((rt) => rt.table.tableNumber)); // placeholder
    setTableMessage("");
    setLoadingTables(true);

    const dateStr = new Date(r.date).toISOString().slice(0, 10);
    const res = await fetch(`/api/public/tables?date=${dateStr}&sessionId=${r.session.id}`);
    const data = await res.json();
    setLoadingTables(false);

    if (res.ok && data.success) {
      setAvailableTables(data.data);
      // Pre-select meja yang sudah dipesan tamu ini
      const currentTableNumbers = r.reservationTables.map((rt) => rt.table.tableNumber);
      const preSelected = data.data
        .filter((t: AvailableTable) => currentTableNumbers.includes(t.tableNumber))
        .map((t: AvailableTable) => t.id);
      setSelectedTableIds(preSelected);
    } else {
      setTableMessage(`❌ Gagal memuat denah meja: ${data.error || "unknown error"}`);
    }
  };

  const toggleTable = (tableId: string) => {
    setSelectedTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handlePatchStatus = async () => {
    if (!patchId.trim()) { setPatchMessage("❌ Masukkan Reservation ID terlebih dahulu."); return; }
    setPatchMessage("⏳ Loading...");
    const res = await fetch(`/api/admin/reservations/${patchId.trim()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: patchStatus }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setPatchMessage(`✅ Berhasil!\nStatus baru: ${data.data.updatedStatus}`);
      fetchReservations(filters.page);
    } else {
      setPatchMessage(`❌ Error: ${data.error || JSON.stringify(data)}`);
    }
  };

  const handlePatchTables = async () => {
    if (!selectedReservation) { setTableMessage("❌ Pilih reservasi terlebih dahulu dari tabel."); return; }
    if (selectedTableIds.length === 0) { setTableMessage("❌ Pilih minimal 1 meja."); return; }
    setTableMessage("⏳ Loading...");
    const res = await fetch(`/api/admin/reservations/${selectedReservation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableIds: selectedTableIds }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setTableMessage(`✅ Berhasil!\nMeja untuk reservasi ${selectedReservation.id.slice(0, 8)}… berhasil diperbarui.`);
      fetchReservations(filters.page);
    } else {
      setTableMessage(`❌ Error: ${data.error || JSON.stringify(data)}`);
    }
  };

  const cell = (content: React.ReactNode) => (
    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", fontSize: "13px", verticalAlign: "middle" }}>{content}</td>
  );

  // Hitung total kapasitas meja yang dipilih untuk tampilan UI
  const selectedCapacity = availableTables
    .filter((t) => selectedTableIds.includes(t.id))
    .reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px" }}>🛠️ Testing: Admin Reservation</h1>
      <p style={{ color: "#666", marginBottom: "28px" }}>
        Dashboard admin — list, update status, dan ganti meja reservasi.&nbsp;
        <a href="/test-reservation" style={{ color: "#2563eb" }}>← Balik ke halaman Public Reservation</a>
      </p>

      {/* ── SECTION 1: LIST ── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px", marginBottom: "28px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "14px" }}>1. GET /api/admin/reservations</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Filter: Tanggal</label>
            <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              style={{ width: "100%", padding: "7px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "13px" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Filter: Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{ width: "100%", padding: "7px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "13px" }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "-- Semua Status --"}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Search: Nama / HP</label>
            <input placeholder="Cari nama atau nomor HP..." value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ width: "100%", padding: "7px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={() => fetchReservations("1")} disabled={loading}
              style={{ width: "100%", background: "#2563eb", color: "#fff", padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
              {loading ? "Loading..." : "Fetch Reservations"}
            </button>
          </div>
        </div>

        {listMessage && (
          <pre style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", fontSize: "12px" }}>{listMessage}</pre>
        )}

        {reservations.length > 0 && (
          <>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
              💡 <strong>Klik baris</strong> untuk mengisi data di Section 2 (Update Status) dan Section 3 (Ganti Meja) secara otomatis.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["ID", "Tamu", "Sesi", "Meja Saat Ini", "Tgl", "Pax", "Status", "Dibuat"].map((h, i) => (
                      <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} onClick={() => handleRowClick(r)}
                      style={{ cursor: "pointer", background: selectedReservation?.id === r.id ? "#eff6ff" : "transparent", transition: "background 0.1s" }}>
                      {cell(<span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6b7280" }}>{r.id.slice(0, 18)}…</span>)}
                      {cell(<><div style={{ fontWeight: "600" }}>{r.guest.name}</div><div style={{ fontSize: "11px", color: "#6b7280" }}>{r.guest.phone}</div></>)}
                      {cell(r.session.name)}
                      {cell(
                        <span style={{ fontWeight: "600", color: "#0d9488" }}>
                          {r.reservationTables.map((rt) => `${rt.table.tableNumber}(${rt.table.capacity})`).join(", ") || "-"}
                        </span>
                      )}
                      {cell(new Date(r.date).toLocaleDateString("id-ID"))}
                      {cell(r.partySize + " org")}
                      {cell(<span style={{ background: STATUS_COLORS[r.status] + "22", color: STATUS_COLORS[r.status], padding: "3px 8px", borderRadius: "100px", fontSize: "11px", fontWeight: "600" }}>{r.status}</span>)}
                      {cell(<span style={{ fontSize: "11px", color: "#9ca3af" }}>{new Date(r.createdAt).toLocaleString("id-ID")}</span>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Total: {meta.total} reservasi | Hal {meta.page} dari {meta.totalPages}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button disabled={meta.page <= 1} onClick={() => fetchReservations(String(meta.page - 1))}
                    style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>← Prev</button>
                  <button disabled={meta.page >= meta.totalPages} onClick={() => fetchReservations(String(meta.page + 1))}
                    style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── SECTION 2 & 3 SIDE BY SIDE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

        {/* ── SECTION 2: UPDATE STATUS ── */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "6px" }}>2. Update Status</h2>
          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "14px" }}>
            <code style={{ background: "#f3f4f6", padding: "2px 5px", borderRadius: "4px" }}>PATCH /api/admin/reservations/:id</code>
          </p>

          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Reservation ID</label>
          <input value={patchId} onChange={(e) => setPatchId(e.target.value)} placeholder="UUID reservasi (klik baris di atas)..."
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace", marginBottom: "10px", boxSizing: "border-box" }} />

          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Status Baru</label>
          <select value={patchStatus} onChange={(e) => setPatchStatus(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "13px", marginBottom: "12px" }}>
            {["confirmed", "checked_in", "no_show", "cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button onClick={handlePatchStatus}
            style={{ width: "100%", background: patchStatus === "cancelled" ? "#dc2626" : "#16a34a", color: "#fff", padding: "9px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
            Update Status
          </button>

          {patchMessage && (
            <pre style={{ marginTop: "12px", background: patchMessage.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${patchMessage.startsWith("✅") ? "#86efac" : "#fecaca"}`, borderRadius: "8px", padding: "10px", fontSize: "12px", whiteSpace: "pre-wrap" }}>
              {patchMessage}
            </pre>
          )}
        </div>

        {/* ── SECTION 3: GANTI MEJA ── */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "6px" }}>3. Ganti / Gabung Meja</h2>
          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "14px" }}>
            <code style={{ background: "#f3f4f6", padding: "2px 5px", borderRadius: "4px" }}>PATCH /api/admin/reservations/:id</code> dengan <code style={{ background: "#f3f4f6", padding: "2px 5px", borderRadius: "4px" }}>tableIds</code>
          </p>

          {!selectedReservation && (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af", fontSize: "13px", border: "2px dashed #e5e7eb", borderRadius: "8px" }}>
              👆 Klik salah satu baris reservasi di tabel atas untuk memilih reservasi yang ingin diubah mejanya.
            </div>
          )}

          {selectedReservation && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "12px" }}>
                <strong>Reservasi:</strong> {selectedReservation.guest.name} ({selectedReservation.partySize} orang) — {selectedReservation.session.name} — {new Date(selectedReservation.date).toLocaleDateString("id-ID")}<br />
                <strong>Meja sekarang:</strong> {selectedReservation.reservationTables.map((rt) => `${rt.table.tableNumber}(${rt.table.capacity} org)`).join(", ") || "-"}
              </div>

              {loadingTables ? (
                <p style={{ fontSize: "13px", color: "#6b7280" }}>⏳ Memuat denah meja...</p>
              ) : (
                <>
                  <p style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
                    Pilih Meja Baru (centang beberapa sekaligus):
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "14px" }}>
                    {availableTables.map((t) => {
                      const isSelected = selectedTableIds.includes(t.id);
                      const isCurrentlyBooked = !t.isAvailable && !isSelected;
                      return (
                        <div key={t.id} onClick={() => !isCurrentlyBooked && toggleTable(t.id)}
                          style={{
                            padding: "10px 6px", borderRadius: "8px", textAlign: "center",
                            cursor: isCurrentlyBooked ? "not-allowed" : "pointer",
                            border: isSelected ? "2px solid #2563eb" : "1px solid #d1d5db",
                            background: isCurrentlyBooked ? "#fee2e2" : isSelected ? "#dbeafe" : "#fff",
                            color: isCurrentlyBooked ? "#b91c1c" : isSelected ? "#1d4ed8" : "#374151",
                            transition: "all 0.15s",
                          }}>
                          <div style={{ fontWeight: "700", fontSize: "13px" }}>{t.tableNumber}</div>
                          <div style={{ fontSize: "11px" }}>{t.capacity} org</div>
                          <div style={{ fontSize: "10px", marginTop: "3px" }}>
                            {isSelected ? "✅ Dipilih" : isCurrentlyBooked ? "🔒 Terisi" : "○ Pilih"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: selectedCapacity >= selectedReservation.partySize ? "#f0fdf4" : "#fef2f2", border: `1px solid ${selectedCapacity >= selectedReservation.partySize ? "#86efac" : "#fecaca"}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px" }}>
                    <strong>Total Kapasitas Dipilih:</strong> {selectedCapacity} orang &nbsp;|&nbsp;
                    <strong>Jumlah Tamu:</strong> {selectedReservation.partySize} orang &nbsp;
                    {selectedCapacity >= selectedReservation.partySize
                      ? <span style={{ color: "#16a34a", fontWeight: "bold" }}>✅ Mencukupi</span>
                      : <span style={{ color: "#dc2626", fontWeight: "bold" }}>❌ Kurang!</span>}
                  </div>

                  <button onClick={handlePatchTables} disabled={selectedTableIds.length === 0}
                    style={{ width: "100%", background: selectedTableIds.length === 0 ? "#d1d5db" : "#7c3aed", color: "#fff", padding: "9px", border: "none", borderRadius: "6px", cursor: selectedTableIds.length === 0 ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "13px" }}>
                    Simpan Perubahan Meja ({selectedTableIds.length} dipilih)
                  </button>
                </>
              )}

              {tableMessage && (
                <pre style={{ marginTop: "12px", background: tableMessage.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${tableMessage.startsWith("✅") ? "#86efac" : "#fecaca"}`, borderRadius: "8px", padding: "10px", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                  {tableMessage}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
