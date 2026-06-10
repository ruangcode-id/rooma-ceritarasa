import ReservationWizard from "@/components/ui/ReservationWizard";

export default function ReservationPage() {
  return (
    <div className="min-h-screen w-full bg-white text-slate-900 pb-20">
      <div className="w-full max-w-4xl mx-auto pt-8 px-4">
        <ReservationWizard />
      </div>
    </div>
  );
}
