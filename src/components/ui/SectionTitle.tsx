import type { ReactNode } from "react";

export type SectionTitleProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  level?: 1 | 2;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  actions,
  level = 2,
}: SectionTitleProps) {
  const headingClassName =
    level === 1
      ? "mt-2 text-3xl font-semibold text-slate-950"
      : "mt-2 text-2xl font-semibold text-slate-950";

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          {eyebrow}
        </p>
        {level === 1 ? (
          <h1 className={headingClassName}>{title}</h1>
        ) : (
          <h2 className={headingClassName}>{title}</h2>
        )}
        {description ? (
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
