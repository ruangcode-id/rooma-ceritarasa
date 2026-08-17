import type { IconComponent } from "@/components/ui/IconButton";

export type MetricCardProps = {
  label: string;
  value: string;
  Icon: IconComponent;
};

export function MetricCard({ label, value, Icon }: MetricCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500 leading-snug">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
    </section>
  );
}
