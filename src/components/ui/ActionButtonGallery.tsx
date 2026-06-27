import { Eye, FloppyDisk, Play, XCircle } from "@phosphor-icons/react";

export type ActionButtonGalleryProps = {
  onOpenModal: () => void;
};

export function ActionButtonGallery({ onOpenModal }: ActionButtonGalleryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <button
        type="button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Play size={17} weight="fill" />
        Reserve
      </button>
      <button
        type="button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <FloppyDisk size={17} />
        Save
      </button>
      <button
        type="button"
        onClick={onOpenModal}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Eye size={17} />
        Preview
      </button>
      <button
        type="button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
      >
        <XCircle size={17} />
        Cancel
      </button>
    </div>
  );
}
