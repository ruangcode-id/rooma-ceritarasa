import type { ComponentType } from "react";

export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

export type IconComponent = ComponentType<{
  size?: number;
  weight?: IconWeight;
  className?: string;
}>;

export type IconButtonProps = {
  label: string;
  Icon: IconComponent;
  onClick?: () => void;
};

export function IconButton({ label, Icon, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <Icon size={18} />
    </button>
  );
}
