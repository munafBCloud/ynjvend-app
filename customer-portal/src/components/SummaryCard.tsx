type SummaryCardProps = {
  label: string;
  value: string | number;
  description?: string;
};

export default function SummaryCard({
  label,
  value,
  description,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-4xl font-bold text-slate-950">
        {value}
      </p>

      {description && (
        <p className="mt-3 text-sm text-slate-500">
          {description}
        </p>
      )}
    </article>
  );
}
