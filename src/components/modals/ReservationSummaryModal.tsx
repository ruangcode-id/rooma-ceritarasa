import { WarningCircle, X } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/IconButton";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

export type ReservationSummaryModalProps<TStatus extends string = string> = {
  activeStatus: TStatus;
  statuses: Array<StatusBadgeOption<TStatus>>;
  quantity: number;
  onClose: () => void;
};

export function ReservationSummaryModal<TStatus extends string>({
  activeStatus,
  statuses,
  quantity,
  onClose,
}: ReservationSummaryModalProps<TStatus>) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm"
    >
      <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Preview
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Reservation summary
            </h2>
          </div>
          <IconButton label="Tutup" Icon={X} onClick={onClose} />
        </div>
        <div className="mt-6 space-y-4 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-500">Status</span>
            <StatusBadge status={activeStatus} statuses={statuses} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-500">Guests</span>
            <span className="text-sm font-semibold text-slate-950">
              {quantity} pax
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-amber-800">
            <WarningCircle size={18} weight="fill" className="mt-0.5" />
            <p className="text-sm leading-6">
              State ini hanya contoh tampilan dan tidak mengirim data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
