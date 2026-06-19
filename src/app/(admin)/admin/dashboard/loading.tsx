import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Memuat dashboard admin">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-4 w-112 max-w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-5 h-8 w-16" />
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {Array.from({ length: 2 }, (_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full" />
            <Skeleton className="mt-6 h-64 w-full" />
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-36" />
            <Skeleton className="mt-6 h-16 w-full" />
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-6 h-56 w-full" />
      </section>

      <span className="sr-only">Dashboard sedang dimuat.</span>
    </div>
  );
}
