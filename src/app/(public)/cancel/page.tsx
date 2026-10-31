import { Suspense } from "react";
import CancelReservationClient from "@/app/(public)/cancel/CancelClient";
import { SettingsUseCase } from "@/application/use-cases/settings/settings.usecase";

export const metadata = {
  title: "Cancel Reservation | Rooma Ceritarasa",
};

export default async function CancelPage() {
  let whatsappNumber = "6285725539262";
  try {
    const settings = await SettingsUseCase.getSettingsAction();
    if (settings.whatsappNumber) {
      whatsappNumber = settings.whatsappNumber;
    }
  } catch (error) {
    console.error("[CancelPage] Failed to fetch settings:", error);
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center py-20 px-4 bg-slate-50">
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<div className="text-center">Memuat...</div>}>
          <CancelReservationClient whatsappNumber={whatsappNumber} />
        </Suspense>
      </div>
    </div>
  );
}
