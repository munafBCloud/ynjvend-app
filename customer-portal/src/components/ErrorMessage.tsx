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
        "rounded-xl border border-red-200 bg-red-50 p-5",
      ].join(" ")}
      role="alert"
    >
      <p className="font-semibold text-red-800">
        {title}
      </p>

      <p className="mt-1 text-sm text-red-700">
        {message}
      </p>
    </div>
  );
}
