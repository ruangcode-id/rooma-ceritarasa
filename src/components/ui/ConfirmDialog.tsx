import {
  WarningCircle,
  X,
} from "@phosphor-icons/react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <WarningCircle size={24} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#1f0609] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3a0d13] shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}
