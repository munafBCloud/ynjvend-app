type LoadingStateProps = {
  message?: string;
  className?: string;
};

export default function LoadingState({
  message = "Loading...",
  className = "mt-8",
}: LoadingStateProps) {
  return (
    <div
      className={[
        className,
        "rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--dd-blue)]" />

        <p className="text-sm text-[var(--dd-text-secondary)]">
          {message}
        </p>
      </div>
    </div>
  );
}
