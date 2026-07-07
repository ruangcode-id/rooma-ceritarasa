"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, ArrowsOutCardinal, Trash, FloppyDisk } from "@phosphor-icons/react";

type TableData = {
  id: string;
  tableNumber: string;
  capacity: number;
  posX: number;
  posY: number;
  status: string;
};

export default function AdminTablesClient() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [deleteTableId, setDeleteTableId] = useState<TableData | null>(null);

  const [newTableNumber, setNewTableNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  async function loadTables() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/tables", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || "Failed to load tables");
      
      // Berikan posisi default jika null
      const processed = (payload.data as TableData[]).map((t, idx) => ({
        ...t,
        posX: t.posX ?? (idx % 5) * 120 + 20,
        posY: t.posY ?? Math.floor(idx / 5) * 120 + 20,
      }));
      
      setTables(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTables();
  }, []);

  const resetForm = () => {
    setIsAdding(false);
    setEditTableId(null);
    setNewTableNumber("");
    setNewCapacity("");
  };

  const handleEditClick = (t: TableData) => {
    setNewTableNumber(t.tableNumber);
    setNewCapacity(String(t.capacity));
    setEditTableId(t.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const executeDelete = async () => {
    if (!deleteTableId) return;
    
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tables/${deleteTableId.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to delete table.");
      }
      
      setDeleteTableId(null);
      void loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber || !newCapacity) return;
    
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        tableNumber: newTableNumber,
        capacity: parseInt(newCapacity),
      };

      const url = editTableId ? `/api/admin/tables/${editTableId}` : "/api/admin/tables";
      const method = editTableId ? "PATCH" : "POST";

      // POST requires posX, posY. PATCH doesn't.
      const finalPayload = editTableId ? payload : { ...payload, posX: 20, posY: 20 };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      const data = await res.json();
      
      if (!res.ok) {
        // Since the API might return the object directly for PATCH instead of { success: true, data } 
        // We need to be careful based on the route implementation.
        // Wait, POST returns { success: true, data }, PATCH returns updatedTable directly? Let's assume it throws on error.
        throw new Error(data.message || data.error || `Failed to ${editTableId ? 'update' : 'add'} table`);
      }
      
      resetForm();
      void loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLayout = async () => {
    setIsSaving(true);
    setError("");
    try {
      const updates = tables.map(t => ({
        id: t.id,
        posX: Math.round(t.posX),
        posY: Math.round(t.posY)
      }));

      const res = await fetch("/api/admin/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save layout");
      
      alert("Table layout saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and Drop Logic
  const handlePointerDown = (e: React.PointerEvent, id: string, startX: number, startY: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingTableId(id);
    
    // Hitung jarak dari kursor ke pojok kiri-atas elemen (offset)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const boardRect = boardRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTableId || !boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    
    // Posisi relatif mouse di dalam board
    let newX = e.clientX - boardRect.left - dragOffset.x;
    let newY = e.clientY - boardRect.top - dragOffset.y;
    
    // Magnet effect (Snap to grid 20px)
    newX = Math.round(newX / 20) * 20;
    newY = Math.round(newY / 20) * 20;
    
    // Batasi agar tidak keluar grid
    const tableWidth = 100;
    const tableHeight = 100;
    
    newX = Math.max(0, Math.min(newX, boardRect.width - tableWidth));
    newY = Math.max(0, Math.min(newY, boardRect.height - tableHeight));
    
    setTables(prev => prev.map(t => t.id === draggingTableId ? { ...t, posX: newX, posY: newY } : t));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingTableId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingTableId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Restaurant Setup</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Table Floor Plan</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Drag and drop tables to arrange your restaurant's 2D layout. Don't forget to click Save after arranging.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { resetForm(); setIsAdding(!isAdding); }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus weight="bold" />
            Add Table
          </button>
          <button
            onClick={handleSaveLayout}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
          >
            <FloppyDisk weight="bold" />
            {isSaving ? "Saving..." : "Save Layout"}
          </button>
        </div>
      </header>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">{error}</div>}

      {isAdding && (
        <form onSubmit={handleAddOrEditTable} className="flex flex-col sm:flex-row gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm items-end animate-in slide-in-from-top-4">
          <div className="flex-1 w-full">
            <h2 className="text-sm font-bold text-slate-900 mb-2">{editTableId ? "Edit Table" : "Add Table"}</h2>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Table Number</label>
            <input 
              type="text" required 
              placeholder="Example: T1"
              value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Capacity (Pax)</label>
            <input 
              type="number" required min="1"
              placeholder="Example: 4"
              value={newCapacity} onChange={e => setNewCapacity(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-50 text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 shadow-sm">
              {editTableId ? "Save Changes" : "Save Table"}
            </button>
          </div>
        </form>
      )}

      {/* Grid Floor Plan Container */}
      <div 
        ref={boardRef}
        className="w-full h-[600px] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 relative overflow-hidden select-none"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-semibold">Loading floor plan...</div>
        ) : tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-semibold">No tables yet. Add your first table.</div>
        ) : (
          tables.map(table => (
            <div
              key={table.id}
              onPointerDown={(e) => handlePointerDown(e, table.id, table.posX, table.posY)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                left: `${table.posX}px`,
                top: `${table.posY}px`,
                touchAction: 'none' // penting untuk mobile drag
              }}
              className={`absolute w-[100px] h-[100px] flex flex-col items-center justify-center rounded-2xl border-2 shadow-sm transition-shadow cursor-grab active:cursor-grabbing group
                ${draggingTableId === table.id ? 'z-10 shadow-xl border-primary scale-105 bg-primary/5' : 'border-slate-300 bg-white hover:border-slate-400'}
                ${table.status === 'OCCUPIED' ? 'bg-red-50 border-red-200' : table.status === 'RESERVED' ? 'bg-blue-50 border-blue-200' : ''}
              `}
            >
              <ArrowsOutCardinal size={16} className={`absolute top-2 right-2 ${draggingTableId === table.id ? 'text-primary' : 'text-slate-300'}`} />
              <div className="text-xl font-bold text-slate-900">{table.tableNumber}</div>
              <div className="text-xs font-semibold text-slate-500 mt-1">{table.capacity} Pax</div>
              
              {/* Action Buttons (visible on hover) */}
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-md border border-slate-200 rounded-full px-2 py-1 z-20"
              >
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditClick(table); }}
                  className="text-xs font-medium text-primary hover:underline px-1 cursor-pointer"
                >
                  Edit
                </button>
                <div className="w-px h-3 bg-slate-200 my-auto" />
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTableId(table); }}
                  className="text-xs font-medium text-red-600 hover:underline px-1 cursor-pointer"
                >
                  Del
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-center text-slate-400 font-medium">Tip: You can drag the table boxes above using mouse or touch.</p>

      {/* Delete Confirmation Modal */}
      {deleteTableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Table</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Are you sure you want to delete table <span className="font-bold text-slate-900">{deleteTableId.tableNumber}</span>? 
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTableId(null)}
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
