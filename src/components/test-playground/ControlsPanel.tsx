import {
  ArrowClockwise,
  Bell,
  CalendarBlank,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { ActionButtonGallery } from "@/components/ui/ActionButtonGallery";
import { IconButton } from "@/components/ui/IconButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  StatusBadge,
  type StatusBadgeOption,
} from "@/components/ui/StatusBadge";

export type ControlsPanelProps<TStatus extends string = string> = {
  activeStatus: TStatus;
  statuses: Array<StatusBadgeOption<TStatus>>;
  setActiveStatus: (status: TStatus) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  onOpenModal: () => void;
};

export function ControlsPanel<TStatus extends string>({
  activeStatus,
  statuses,
  setActiveStatus,
  quantity,
  setQuantity,
  onOpenModal,
}: ControlsPanelProps<TStatus>) {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle eyebrow="Actions" title="Button states" />
        <div className="mt-6">
          <ActionButtonGallery onOpenModal={onOpenModal} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <IconButton label="Cari" Icon={MagnifyingGlass} />
          <IconButton label="Refresh" Icon={ArrowClockwise} />
          <IconButton label="Notifikasi" Icon={Bell} />
          <IconButton label="Kalender" Icon={CalendarBlank} />
        </div>
      </section>

      <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_280px]">
        <div>
          <SectionTitle eyebrow="Status" title="Badges and segmented control" />
          <div className="mt-6 flex flex-wrap gap-3">
            {statuses.map((status) => {
              const Icon = status.Icon;
              const selected = status.id === activeStatus;

              return (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setActiveStatus(status.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"
                  }`}
                >
                  <Icon size={16} weight={selected ? "fill" : "regular"} />
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-700">Selected</p>
          <div className="mt-4">
            <StatusBadge status={activeStatus} statuses={statuses} />
          </div>
          <label
            htmlFor="guest-count"
            className="mt-6 block text-sm font-semibold text-slate-700"
          >
            Guest count
          </label>
          <input
            id="guest-count"
            type="range"
            min="1"
            max="12"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="mt-3 w-full accent-primary"
          />
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {quantity} pax
          </p>
        </div>
      </section>
    </div>
  );
}
