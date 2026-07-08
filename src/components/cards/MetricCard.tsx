import type { IconComponent } from "@/components/ui/IconButton";

export type MetricCardProps = {
  label: string;
  value: string;
  Icon: IconComponent;
};

export function MetricCard({ label, value, Icon }: MetricCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-slate-950">{value}</p>
    </section>
  );
}
