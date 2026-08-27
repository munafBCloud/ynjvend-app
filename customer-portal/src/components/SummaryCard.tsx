type SummaryCardProps = {
  label: string;
  value: string | number;
  description?: string;
  accent?: "orange" | "blue" | "neutral";
};

export default function SummaryCard({
  label,
  value,
  description,
  accent = "neutral",
}: SummaryCardProps) {
  const accentClasses = {
    orange: "bg-[var(--dd-orange)]",
    blue: "bg-[var(--dd-blue)]",
    neutral: "bg-[var(--dd-border-strong)]",
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5">
      <div
        className={[
          "absolute left-0 top-0 h-full w-[2px]",
          accentClasses[accent],
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-4">
        <p className="dd-label">
          {label}
        </p>

        <span
          className={[
            "mt-1 h-1.5 w-1.5 rounded-full",
            accentClasses[accent],
          ].join(" ")}
        />
      </div>

      <p className="dd-data-value mt-4 text-3xl font-bold text-[var(--dd-text)]">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs leading-5 text-[var(--dd-text-muted)]">
          {description}
        </p>
      )}
    </article>
  );
}
