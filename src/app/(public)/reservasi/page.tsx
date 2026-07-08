import ReservationWizard from "@/components/ui/ReservationWizard";
import { Suspense } from "react";

export default function ReservationPage() {
  const snapClientKey = process.env.MIDTRANS_CLIENT_KEY ?? "";
  const snapScriptUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 pb-20">
      <div className="w-full max-w-4xl mx-auto pt-8 px-4">
        <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
          <ReservationWizard
            snapClientKey={snapClientKey}
            snapScriptUrl={snapScriptUrl}
          />
        </Suspense>
      </div>
    </div>
  );
}
