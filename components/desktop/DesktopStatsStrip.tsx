"use client";

import { usePublicStats } from "@/lib/queries/hooks";
import { toArabicNumerals, formatRelativeTime } from "@/lib/arabic";
import type { Product } from "@/types/app";

interface DesktopStatsStripProps {
  products: Product[];
  isLoading?: boolean;
}

export function DesktopStatsStrip({ products, isLoading = false }: DesktopStatsStripProps) {
  const { data: stats, isLoading: statsLoading } = usePublicStats();
  const loading = isLoading || statsLoading;

  // Compute avg from products with price_preview
  const allPrices = products.flatMap((p) =>
    (p.price_preview ?? []).map((pp) => pp.price)
  );
  const avg = allPrices.length > 0
    ? (allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(2)
    : "—";

  // Latest reported_at from preview data
  const allDates = products.flatMap((p) =>
    (p.price_preview ?? []).map((pp) => pp.reported_at)
  );
  const latestDate = allDates.length > 0
    ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    : null;

  const cards = [
    { label: "متوسط السعر", value: avg !== "—" ? `${avg} ₪` : "—", icon: "📊" },
    { label: "إجمالي البلاغات", value: stats?.prices != null ? toArabicNumerals(stats.prices) : "—", icon: "📋" },
    { label: "منتجات مرصودة", value: stats?.products != null ? toArabicNumerals(stats.products) : "—", icon: "📦" },
    { label: "آخر تحديث", value: latestDate ? formatRelativeTime(latestDate) : "—", icon: "🕐" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface rounded-xl px-5 py-5 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-fog animate-pulse" />
            <div className="w-16 h-3 rounded bg-fog animate-pulse" />
            <div className="w-12 h-5 rounded bg-fog animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface rounded-xl px-5 py-5 flex flex-col items-center justify-center text-center gap-2 shadow-sm"
        >
          <span className="text-3xl">{card.icon}</span>
          <div className="text-xs text-mist font-body">{card.label}</div>
          <div className="font-display font-bold text-xl text-ink leading-tight">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
