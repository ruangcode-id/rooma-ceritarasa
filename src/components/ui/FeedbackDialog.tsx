import {
  CheckCircle,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";

export type FeedbackDialogVariant = "success" | "error" | "warning";

export type FeedbackDialogProps = {
  open: boolean;
  title: string;
  message: string;
  variant?: FeedbackDialogVariant;
  onClose: () => void;
};

const variants = {
  success: {
    className: "bg-green-50 text-green-700",
    Icon: CheckCircle,
  },
  error: {
    className: "bg-red-50 text-red-600",
    Icon: XCircle,
  },
  warning: {
    className: "bg-amber-50 text-amber-700",
    Icon: WarningCircle,
  },
} satisfies Record<
  FeedbackDialogVariant,
  {
    className: string;
    Icon: typeof CheckCircle;
  }
>;

export function FeedbackDialog({
  open,
  title,
  message,
  variant = "success",
  onClose,
}: FeedbackDialogProps) {
  if (!open) return null;

  const item = variants[variant];
  const Icon = item.Icon;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.className}`}
          >
            <Icon size={22} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="feedback-dialog-title"
              className="text-xl font-semibold text-slate-950"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
