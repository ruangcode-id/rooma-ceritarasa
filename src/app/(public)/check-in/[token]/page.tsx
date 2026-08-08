import { findReservationByLookup, findReservationByIdForAdmin } from "@/infrastructure/repositories/reservation.repository";
import { markReservationCheckedIn } from "@/infrastructure/repositories/check-in.repository";
import { broadcastStaffNotification } from "@/infrastructure/notifications/broadcast-staff";
import { CheckCircle, Clock, MapPinLine, Users, CalendarBlank, WarningCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

interface CheckInPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirm?: string }>;
}

export default async function PublicCheckInPage({ params, searchParams }: CheckInPageProps) {
  const { token } = await params;
  const { confirm } = await searchParams;

  const rawReservation = await findReservationByLookup(token);

  if (!rawReservation) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-white/10 p-8 text-center space-y-4 shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <XCircle size={36} weight="fill" />
          </div>
          <h1 className="text-2xl font-bold">Invalid Check-In Code</h1>
          <p className="text-slate-400 text-sm">
            No active reservation matches check-in code <code className="text-amber-400 font-mono bg-white/5 px-2 py-1 rounded">{token}</code>. Please double-check your code with staff.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const reservation = await findReservationByIdForAdmin(rawReservation.id);
  if (!reservation) {
    return null;
  }

  let isJustCheckedIn = false;
  let errorMessage = "";

  if (confirm === "true" && (reservation.status === "confirmed" || reservation.status === "pending")) {
    try {
      await markReservationCheckedIn(reservation.id, "SELF_CHECK_IN");
      await broadcastStaffNotification({
        type: "check_in",
        title: "Check-in Tamu (Self/QR)",
        body: `Check-in OK · ${reservation.guest.name} (${reservation.reservationTables.map(rt => rt.table.tableNumber).join(", ") || "-"})`,
        relatedId: reservation.id,
      });
      isJustCheckedIn = true;
      reservation.status = "checked_in";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Check-in failed.";
    }
  }

  const tableNumbers = (reservation.reservationTables || [])
    .map((rt) => rt.table.tableNumber)
    .filter(Boolean);

  const tableDisplay =
    tableNumbers.length > 0
      ? tableNumbers.map((t) => (t.toLowerCase().startsWith("table") ? t : `Table ${t}`)).join(", ")
      : "-";

  const isAlreadyCheckedIn = reservation.status === "checked_in" || isJustCheckedIn;

  return (
    <div className="min-h-screen bg-linear-to-b from-[#180407] via-[#0d0204] to-[#050001] text-white pt-20 pb-16 px-4 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Image
            src="/assets/logo_no_background.png"
            alt="Rooma Ceritarasa"
            width={140}
            height={44}
            className="mx-auto brightness-0 invert opacity-90 w-32 sm:w-40 h-auto"
          />
          <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-bold">
            Guest Self Check-In
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>

          {/* Status Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50 font-semibold">
                Reservation Code
              </p>
              <p className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                {reservation.checkInToken || reservation.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isAlreadyCheckedIn
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {isAlreadyCheckedIn ? "Checked In" : reservation.status}
            </span>
          </div>

          {/* Alert Error if any */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
              <WarningCircle size={20} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner if checked in */}
          {isAlreadyCheckedIn && (
            <div className="p-5 rounded-2xl bg-linear-to-r from-green-950/60 to-slate-900 border border-green-500/40 text-left space-y-1">
              <div className="flex items-center gap-2 text-green-400 font-bold text-base">
                <CheckCircle size={24} weight="fill" />
                <span>Welcome to Rooma Ceritarasa!</span>
              </div>
              <p className="text-xs text-white/70">
                Your check-in is confirmed. Please proceed to your assigned table.
              </p>
            </div>
          )}

          {/* Guest Details */}
          <div className="space-y-4 text-left">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                Guest Name
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wide">
                {reservation.guest.name}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <MapPinLine size={16} weight="bold" />
                  <span>Assigned Table</span>
                </div>
                <p className="text-base font-bold text-white tracking-wide">
                  {tableDisplay}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <Users size={16} weight="bold" />
                  <span>Party Size</span>
                </div>
                <p className="text-base font-bold text-white tracking-wide">
                  {reservation.partySize} Guests
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <CalendarBlank size={18} className="text-amber-400 shrink-0" />
                <span>
                  {new Date(reservation.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-mono">
                <Clock size={18} className="text-amber-400 shrink-0" />
                <span>{reservation.session.name}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isAlreadyCheckedIn && (
            <div className="pt-2">
              <Link
                href={`/check-in/${encodeURIComponent(token)}?confirm=true`}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-6 shadow-lg shadow-amber-500/20 transition-all active:scale-98 text-sm uppercase tracking-wider"
              >
                <CheckCircle size={22} weight="bold" />
                Confirm Check-In Now
              </Link>
              <p className="text-[11px] text-white/40 text-center mt-3">
                Tap button to confirm check-in at reception desk
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
