type ErrorMessageProps = {
  title?: string;
  message: string;
  className?: string;
};

export default function ErrorMessage({
  title = "Unable to complete this action",
  message,
  className = "mt-8",
}: ErrorMessageProps) {
  return (
    <div
      className={[
        className,
        "rounded-xl border border-red-900/60 bg-[var(--dd-danger-soft)] p-5",
      ].join(" ")}
      role="alert"
    >
      <div className="flex gap-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--dd-danger)]" />

        <div>
          <p className="font-semibold text-red-300">
            {title}
          </p>

          <p className="mt-1 text-sm text-red-300/70">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
