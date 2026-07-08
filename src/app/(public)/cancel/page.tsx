import { Suspense } from "react";
import CancelReservationClient from "@/app/(public)/cancel/CancelClient";

export const metadata = {
  title: "Cancel Reservation | Rooma Ceritarasa",
};

export default function CancelPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center py-20 px-4 bg-slate-50">
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<div className="text-center">Memuat...</div>}>
          <CancelReservationClient />
        </Suspense>
      </div>
    </div>
  );
}
