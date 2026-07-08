import type { IconComponent } from "./IconButton";

export type StatusBadgeOption<TStatus extends string = string> = {
  id: TStatus;
  label: string;
  className: string;
  Icon: IconComponent;
};

export type StatusBadgeProps<TStatus extends string = string> = {
  status: TStatus;
  statuses: Array<StatusBadgeOption<TStatus>>;
};

export function StatusBadge<TStatus extends string>({
  status,
  statuses,
}: StatusBadgeProps<TStatus>) {
  const item = statuses.find((option) => option.id === status) ?? statuses[0];
  const Icon = item.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${item.className}`}
    >
      <Icon size={14} weight="fill" />
      {item.label}
    </span>
  );
}
