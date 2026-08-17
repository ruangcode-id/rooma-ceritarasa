"use client";

import { useEffect, useState } from "react";
import {
  MagnifyingGlass,
  Crown,
  Clock,
  MapPinLine,
  UserCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { enUS as localeId } from "date-fns/locale";
import { handleApiError } from "@/lib/handle-api-error";

export type VipLogItem = {
  id: string;
  guestId: string;
  guestName: string;
  phone: string;
  email: string | null;
  checkedInAt: string;
  checkedInBy: string | null;
  notes: string | null;
};

export default function AdminVipLogsClient() {
  const [logs, setLogs] = useState<VipLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);

        const res = await fetch(`/api/admin/vip/logs?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await handleApiError(res));

        const payload = await res.json();
        if (!payload.success) throw new Error(payload.error || "Failed to fetch VIP logs");

        setLogs(payload.data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error unknown");
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchLogs, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [search]);

  // Compute summary stats
  const totalArrivals = logs.length;
  const todayArrivals = logs.filter((l) => {
    const today = new Date().toDateString();
    return new Date(l.checkedInAt).toDateString() === today;
  }).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <SectionTitle
          eyebrow="VIP Operations"
          title="VIP Arrival Dashboard"
          level={1}
          description="Track and monitor real-time VIP guest check-in history and lounge arrivals."
        />
      </header>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-500/10 to-amber-500/5 p-5 shadow-xs flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
            <Crown size={24} weight="fill" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800/80">
              VIP Arrivals Today
            </p>
            <h3 className="text-2xl font-bold text-amber-950 mt-0.5">{todayArrivals}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
            <UserCheck size={24} weight="bold" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Logged Visits
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalArrivals}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
            <Clock size={24} weight="bold" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Latest Arrival
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5 truncate max-w-40">
              {logs[0] ? logs[0].guestName : "-"}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Crown size={20} weight="fill" className="text-amber-500" />
            VIP Arrival History Logs
          </h2>

          <div className="flex w-full rounded-lg border border-slate-300 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary lg:w-72">
            <span className="grid size-10 shrink-0 place-items-center text-slate-400">
              <MagnifyingGlass size={16} weight="bold" />
            </span>
            <input
              type="search"
              placeholder="Search VIP arrival log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-transparent py-2 pr-3 text-sm outline-none"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>
        ) : null}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-150 text-left text-sm">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Check-in Time</th>
                <th className="px-4 py-3">VIP Guest Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Arrival Type</th>
                <th className="px-4 py-3">Notes / Benefits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <LoadingSpinner className="mx-auto size-8" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No VIP arrival logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-amber-50/20">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {format(new Date(log.checkedInAt), "dd MMM yyyy · HH:mm:ss", { locale: localeId })}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-950">
                      <div className="flex items-center gap-1.5">
                        <Crown size={14} weight="fill" className="text-amber-500 shrink-0" />
                        <span>{log.guestName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{log.phone}</p>
                      {log.email && <p className="text-xs text-slate-400">{log.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        <MapPinLine size={12} weight="fill" />
                        VIP Walk-in
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {log.notes || <span className="text-slate-400 italic">No notes</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
