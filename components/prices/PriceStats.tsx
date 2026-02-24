import { PriceStats as PriceStatsType } from "@/types/app";
import { toArabicNumerals } from "@/lib/arabic";

interface PriceStatsProps {
  stats: PriceStatsType;
}

export function PriceStats({ stats }: PriceStatsProps) {
  const items = [
    { label: "متوسط ₪", value: stats.avg_price.toFixed(2) },
    { label: "وسيط ₪", value: stats.median_price.toFixed(2) },
    { label: "تقارير", value: toArabicNumerals(stats.report_count) },
  ];

  return (
    <div className="flex gap-1 shrink-0">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="bg-white border border-border rounded px-1.5 py-0.5 text-center shrink-0"
        >
          <div className="price-number font-display font-semibold text-[10px] text-ink leading-tight">{value}</div>
          <div className="text-[9px] text-mist leading-tight">{label}</div>
        </div>
      ))}
    </div>
  );
}
