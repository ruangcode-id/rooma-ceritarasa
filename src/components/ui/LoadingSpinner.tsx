export type LoadingSpinnerProps = {
  className?: string;
};

export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`size-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary motion-reduce:animate-none ${className}`}
    />
  );
}
