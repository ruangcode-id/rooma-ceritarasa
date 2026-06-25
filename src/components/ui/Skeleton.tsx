export type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}
