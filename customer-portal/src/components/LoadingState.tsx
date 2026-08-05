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
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <p className="text-slate-600">
        {message}
      </p>
    </div>
  );
}
