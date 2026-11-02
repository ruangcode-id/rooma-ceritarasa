import { Suspense } from "react";
import ReservationWizard from "@/components/ui/ReservationWizard";
import ReservationFlowGuide from "@/components/public/ReservationFlowGuide";
import { prisma } from "@/infrastructure/database/prisma";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const snapClientKey = process.env.MIDTRANS_CLIENT_KEY ?? "";
  const snapScriptUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  let initialSessions: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isOutdoorAllowed?: boolean;
  }[] = [];

  try {
    const rawSessions = await prisma.restaurantSession.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });

    initialSessions = rawSessions.map((s) => ({
      id: s.id,
      name: s.name,
      startTime: s.startTime instanceof Date ? s.startTime.toISOString() : String(s.startTime),
      endTime: s.endTime instanceof Date ? s.endTime.toISOString() : String(s.endTime),
      isOutdoorAllowed: s.isOutdoorAllowed,
    }));
  } catch (err) {
    console.error("Failed to load initial sessions in ReservationPage:", err);
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 pb-20">
      <div className="w-full max-w-4xl mx-auto pt-8 px-4">
        <ReservationFlowGuide />
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat formulir reservasi...</div>}>
          <ReservationWizard
            snapClientKey={snapClientKey}
            snapScriptUrl={snapScriptUrl}
            initialSessions={initialSessions}
          />
        </Suspense>
      </div>
    </div>
  );
}