"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import type { Product, Price } from "@/types/app";
import { previewToPrice, isStale, calcStats, getAverage } from "@/lib/price";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
import { FlagButton } from "@/components/actions/FlagButton";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { cn } from "@/lib/utils";

interface DesktopPriceCardProps {
  product: Product;
  index?: number;
}

type Trend = "up" | "down" | "stable";

function getTrend(prices: Price[]): Trend {
  if (prices.length < 2) return "stable";
  const sorted = [...prices].sort(
    (a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
  );
  const latest = sorted[0].price;
  const prev = sorted[1].price;
  if (latest > prev) return "up";
  if (latest < prev) return "down";
  return "stable";
}

const TREND_COLORS: Record<Trend, string> = {
  up: "bg-sand",
  down: "bg-confirm",
  stable: "bg-olive-mid",
};

const TREND_LABELS: Record<Trend, string> = {
  up: "ارتفاع",
  down: "انخفاض",
  stable: "مستقر",
};

const TREND_TEXT_COLORS: Record<Trend, string> = {
  up: "text-sand bg-sand/10",
  down: "text-confirm bg-confirm/10",
  stable: "text-olive bg-olive-pale",
};

export const DesktopPriceCard = memo(function DesktopPriceCard({ product, index = 0 }: DesktopPriceCardProps) {
  const { overrides } = useConfirmationOverrides();
  const previews = product.price_preview ?? [];
  if (previews.length === 0) return null;

  const minPrice = Math.min(...previews.map((p) => p.price));
  const prices: Price[] = previews.map((p) =>
    previewToPrice(p, product, p.price === minPrice)
  );

  const trend = useMemo(() => getTrend(prices), [prices]);
  const stats = calcStats(prices);
  const latest = prices.reduce((a, b) =>
    new Date(b.reported_at) > new Date(a.reported_at) ? b : a
  );
  const displayCount = overrides[latest.id] ?? latest.confirmation_count;
  const stale = isStale(latest.reported_at);
  const maxPrice = Math.max(...prices.map((p) => p.price));
  const range = maxPrice - stats.min_price;
  const markerPos = range > 0 ? ((latest.price - stats.min_price) / range) * 100 : 50;

  const staggerClass = index < 9 ? `stagger-${index}` : "";

  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-border overflow-hidden hover:border-olive/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 animate-fade-up",
        staggerClass
      )}
    >
      {/* Trend strip */}
      <div className={cn("h-[3px]", TREND_COLORS[trend])} />

      <div className="p-4">
        {/* Product info row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">{product.category?.icon ?? "📦"}</span>
            <div className="min-w-0">
              <Link
                href={`/product/${product.id}`}
                className="font-display font-bold text-sm text-ink hover:text-olive transition-colors truncate block cursor-pointer"
              >
                {product.name_ar}
              </Link>
              <span className="text-[11px] text-mist">
                {product.unit_size} {product.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Price display */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="price-number font-display font-extrabold text-2xl text-olive">
              {latest.price.toFixed(2)}
            </span>
            <span className="text-sm text-mist">₪</span>
          </div>
        </div>

        {/* Range bar */}
        {prices.length > 1 && range > 0 && (
          <div className="mb-3">
            <div className="h-1.5 bg-fog rounded-full relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-olive border-2 border-surface shadow-sm"
                style={{ right: `${markerPos}%`, transform: "translate(50%, -50%)" }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-[11px] text-mist">
            <span>{toArabicNumerals(stats.report_count)} بلاغ</span>
            <span>·</span>
            <span className={stale ? "text-sand" : ""}>
              {stale && "⚠️ "}{formatRelativeTime(latest.reported_at)}
            </span>
          </div>
          {!latest.is_mine && (
            <div className="flex items-center gap-2">
              <ConfirmButton
                priceId={latest.id}
                productId={product.id}
                initialCount={latest.confirmation_count}
                confirmedByMe={latest.confirmed_by_me}
                flaggedByMe={latest.flagged_by_me}
              />
              <FlagButton
                priceId={latest.id}
                initialCount={latest.flag_count}
                flaggedByMe={latest.flagged_by_me}
                confirmedByMe={latest.confirmed_by_me}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
