"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MagnifyingGlass,
  Crown,
  DownloadSimple,
} from "@phosphor-icons/react";
import { downloadVipCardImage } from "@/lib/download-vip-card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { enUS as localeId } from "date-fns/locale";
import VipAssignModal from "@/components/modals/VipAssignModal";
import { handleApiError } from "@/lib/handle-api-error";

export type VipCardData = {
  id: string;
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
  const searchParams = useSearchParams();
  const vipGuestParam = searchParams.get("vipGuest");

  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestRow | null>(null);
  const [guestToRevoke, setGuestToRevoke] = useState<GuestRow | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Fetch Guests
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
        if (!payload.success) throw new Error(payload.error || "Failed to fetch guests");

        const formattedData = payload.data.map((g: GuestRow) => ({
          ...g,
          isVip: g.isVip || !!g.vipCard,
        }));
        setGuests(formattedData);

        if (vipGuestParam) {
          const match = formattedData.find((g: GuestRow) => g.id === vipGuestParam);
          if (match) setSelectedGuest(match);
        }
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
  }, [search, filter, vipGuestParam]);

  const handleActionClick = (guest: GuestRow) => {
    setSelectedGuest(guest);
  };

  const handleModalClose = (wasAssigned: boolean) => {
    setSelectedGuest(null);
    if (wasAssigned) {
      setFilter("vip");
      setSearch("");
    }
  };

  const handleRevoke = async () => {
    if (!guestToRevoke) return;
    setIsRevoking(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/vip/${guestToRevoke.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await handleApiError(res));

      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error || "Failed to revoke VIP");

      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestToRevoke.id ? { ...g, isVip: false, vipCard: null } : g
        )
      );
      setGuestToRevoke(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error unknown");
    } finally {
      setIsRevoking(false);
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

      {/* Main Table Section */}
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex rounded-lg bg-slate-100 p-1 w-full sm:w-auto">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All Guests
            </button>
            <button
              onClick={() => setFilter("vip")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                filter === "vip" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              VIP Members Only
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

        {/* Members Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-150 text-left text-sm">
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
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() =>
                              downloadVipCardImage({
                                guestName: guest.name,
                                token: guest.vipCard?.token || "VIP-MEMBER",
                                qrCodeUrl: guest.vipCard?.qrCodeUrl,
                                issuedAt: guest.vipCard?.issuedAt,
                              })
                            }
                            title="Download VIP Card (PNG)"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                          >
                            <DownloadSimple size={14} weight="bold" />
                            Download
                          </button>
                          <button
                            onClick={() => handleActionClick(guest)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            View Card
                          </button>
                          <button
                            onClick={() => setGuestToRevoke(guest)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          >
                            Revoke VIP
                          </button>
                        </div>
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

      {/* Modal Revoke Confirmation */}
      {guestToRevoke && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isRevoking && setGuestToRevoke(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Revoke VIP Status?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to revoke VIP membership for <strong>{guestToRevoke.name}</strong>? This action will deactivate their digital card.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={isRevoking}
                onClick={() => setGuestToRevoke(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isRevoking}
                onClick={handleRevoke}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isRevoking ? <LoadingSpinner className="size-4" /> : null}
                Yes, Revoke VIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
