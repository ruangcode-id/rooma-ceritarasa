"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass, Crown } from "@phosphor-icons/react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { enUS as localeId } from "date-fns/locale";
import VipAssignModal from "@/components/modals/VipAssignModal";
import { handleApiError } from "@/lib/handle-api-error";

export type VipCardData = {
  id: string;
  tier: string;
  token: string;
  qrCodeUrl: string | null;
  benefits: string | null;
  isActive: boolean;
  issuedAt: string;
};

export type GuestRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isVip: boolean;
  createdAt: string;
  vipCard: VipCardData | null;
};

export default function AdminVipClient() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  
  const [selectedGuest, setSelectedGuest] = useState<GuestRow | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchGuests = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (filter !== "all") params.set("filter", filter);

        const res = await fetch(`/api/admin/vip/guests?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await handleApiError(res));

        const payload = await res.json();
        
        if (!payload.success) {
          throw new Error(payload.error || "Failed to fetch guest data");
        }
        
        const formattedData = payload.data.map((g: GuestRow) => ({
          ...g,
          isVip: g.isVip || !!g.vipCard,
        }));
        setGuests(formattedData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error unknown");
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchGuests, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [search, filter]);

  const handleActionClick = (guest: GuestRow) => {
    setSelectedGuest(guest);
  };

  const handleModalClose = (wasAssigned: boolean) => {
    setSelectedGuest(null);
    if (wasAssigned) {
      // Refresh list to show updated VIP status
      setFilter("vip"); // Jump to VIP tab automatically or just refresh
      setSearch("");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <SectionTitle
          eyebrow="Loyalty Program"
          title="VIP Management"
          level={1}
          description="Enroll your regular customers into the VIP program to provide an exclusive digital membership card."
        />
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex rounded-lg bg-slate-100 p-1 w-full sm:w-auto">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All Guests
            </button>
            <button
              onClick={() => setFilter("vip")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                filter === "vip" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              VIP Members
            </button>
          </div>

          <div className="flex w-full rounded-lg border border-slate-300 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary lg:w-72">
            <span className="grid size-10 shrink-0 place-items-center text-slate-400">
              <MagnifyingGlass size={16} weight="bold" />
            </span>
            <input
              type="search"
              placeholder="Search name or number..."
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
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Guest Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Registered Since</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <LoadingSpinner className="mx-auto size-8" />
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No guests found.
                  </td>
                </tr>
              ) : (
                guests.map((guest) => (
                  <tr key={guest.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{guest.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{guest.phone}</p>
                      {guest.email && <p className="text-xs text-slate-400">{guest.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {format(new Date(guest.createdAt), "dd MMM yyyy", { locale: localeId })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {guest.isVip ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                          <Crown size={14} weight="fill" />
                          VIP
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                          Regular
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {guest.isVip ? (
                        <button
                          onClick={() => handleActionClick(guest)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Card
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActionClick(guest)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
                        >
                          Make VIP
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Assignment & Card Display */}
      {selectedGuest && (
        <VipAssignModal 
          guest={selectedGuest} 
          onClose={handleModalClose} 
        />
      )}
    </div>
  );
}
