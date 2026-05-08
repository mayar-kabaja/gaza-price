"use client";

import { memo } from "react";
import Link from "next/link";
import { Product } from "@/types/app";
import { useSession } from "@/hooks/useSession";
import { usePrices } from "@/lib/queries/hooks";
import { PriceCard } from "@/components/prices/PriceCard";
import { PriceStats } from "@/components/prices/PriceStats";
import { LoaderDots } from "@/components/ui/LoaderDots";
import type { Price, PriceStats as PriceStatsType } from "@/types/app";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { previewToPrice } from "@/lib/price";
import { useVote } from "@/hooks/useVote";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { cn } from "@/lib/utils";

const PRICES_PREVIEW = 5;
const PRICES_PREVIEW_SLOW = 2;

interface HomeProductCardProps {
  product: Product;
  areaId?: string | null;
  isRefetching?: boolean;
}

export const HomeProductCard = memo(function HomeProductCard({ product, areaId = null, isRefetching = false }: HomeProductCardProps) {
  const { accessToken, loading: sessionLoading } = useSession();
  const isDesktop = useIsDesktop();
  const connection = useConnectionQuality();
  const priceLimit = connection === "slow" ? PRICES_PREVIEW_SLOW : PRICES_PREVIEW;
  const hasPricePreview = Array.isArray(product.price_preview) && product.price_preview.length > 0;

  const { data, isLoading, isError } = usePrices({
    productId: hasPricePreview ? null : product.id,
    areaId,
    sort: "price_asc",
    limit: priceLimit,
    sessionLoading,
    accessToken,
  });

  const pricesFromPreview = hasPricePreview
    ? (product.price_preview!.slice(0, priceLimit).map((p, i) => {
        const minPrice = Math.min(...product.price_preview!.map((x) => x.price));
        return previewToPrice(p, product, p.price === minPrice);
      }) as Price[])
    : [];
  const pricesFromFetch = (data?.prices ?? []) as Price[];
  const prices = hasPricePreview ? pricesFromPreview : pricesFromFetch;
  const showLoading = !hasPricePreview && (isLoading || sessionLoading);

  const total = data?.total ?? product.price_preview?.length ?? 0;
  const minPrice = prices.length > 0 ? Math.min(...prices.map((x) => x.price)) : 0;
  const computedAvg = prices.length > 0
    ? prices.reduce((s, p) => s + Number(p.price), 0) / prices.length
    : 0;
  const stats: PriceStatsType = {
    avg_price: data?.stats?.avg_price ?? computedAvg,
    median_price: data?.stats?.median_price ?? computedAvg,
    min_price: data?.stats?.min_price ?? minPrice,
    report_count: total,
  };

  const px = isDesktop ? '' : 'px-4';

  if (isDesktop) {
    return (
      <section className="mb-4">
        {/* Product header — outside the white box */}
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <Link
            href={`/product/${product.id}`}
            className="font-display font-semibold text-[14px] text-ink shrink-0 hover:text-olive transition-colors"
          >
            {product.name_ar}
          </Link>
          {!showLoading && !isError && prices.length > 0 && (
            <PriceStats stats={stats} />
          )}
        </div>
        {/* Price rows — white box */}
        <div className="bg-surface rounded-2xl overflow-hidden border border-border/40">
          {showLoading ? (
            <div className="flex items-center justify-center py-6">
              <LoaderDots size="sm" />
            </div>
          ) : isError ? (
            <p className="text-mist text-xs py-4 px-4">تعذر تحميل الأسعار</p>
          ) : prices.length === 0 ? (
            <p className="text-mist text-xs py-4 px-4">لا توجد أسعار لهذا المنتج بعد</p>
          ) : (
            prices.map((price) => (
              <DesktopPriceRow key={price.id} price={price} />
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className={`flex items-center justify-between gap-2 mb-2 ${px}`}>
        <Link
          href={`/product/${product.id}`}
          className="font-display font-bold text-sm text-ink shrink-0 hover:text-olive transition-colors"
        >
          {product.name_ar}
        </Link>
        {!showLoading && !isError && prices.length > 0 && (
          <PriceStats stats={stats} />
        )}
      </div>
      <div className={`space-y-2 ${px}`}>
        {showLoading ? (
          <div className="flex items-center justify-center py-6">
            <LoaderDots size="sm" />
          </div>
        ) : isError ? (
          <p className="text-mist text-xs py-2">تعذر تحميل الأسعار</p>
        ) : prices.length === 0 ? (
          <p className="text-mist text-xs py-2">لا توجد أسعار لهذا المنتج بعد</p>
        ) : (
          prices.map((price) => (
            <PriceCard key={price.id} price={price} isRefetching={isRefetching} />
          ))
        )}
      </div>
    </section>
  );
});

/* ─── Desktop Price Row ─── */
function DesktopPriceRow({ price }: { price: Price }) {
  const storeName = price.store?.name_ar ?? price.store_name_raw ?? "";
  const { myVote, confirmCount, flagCount, loading, vote } = useVote(price.id, {
    initialVote: price.my_vote,
    initialConfirmCount: price.confirmation_count,
    initialFlagCount: price.flag_count,
  });

  return (
    <div className="flex items-center gap-3 px-4 lg:px-6 py-2.5 border-t border-border/20 last:border-b-0 transition-colors hover:bg-olive-pale/40">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {storeName && (
            <span className="text-[12px] text-ink">{storeName}</span>
          )}
          {price.is_lowest && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#E1F5EE", color: "#0F6E56" }}>أدنى سعر</span>
          )}
        </div>
        <div className="text-[10px] text-mist flex items-center gap-1">
          {price.area?.name_ar && (
            <>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {price.area.name_ar}
              <span className="opacity-40 mx-0.5">&middot;</span>
            </>
          )}
          <span>{formatRelativeTime(price.reported_at)}</span>
          <span className="opacity-40 mx-0.5">&middot;</span>
          <span>{toArabicNumerals(confirmCount)} تأكيد</span>
        </div>
      </div>

      {/* Price + actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="text-left">
          <span className="text-[16px] font-bold text-olive">{price.price.toFixed(2)}</span>
          <span className="text-[11px] text-mist mr-0.5">₪</span>
        </div>
        {price.is_mine ? (
          <span className="px-2 py-1 rounded-full text-[9px] font-semibold bg-olive/15 text-olive border border-olive/30">سعرك</span>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!loading) vote("confirm"); }}
              disabled={loading}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                myVote === "confirm"
                  ? "bg-olive text-white"
                  : "bg-olive-pale text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-50"
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!loading) vote("flag"); }}
              disabled={loading}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                myVote === "flag"
                  ? "bg-[#6B7280] text-white"
                  : "bg-fog text-[#6B7280] hover:bg-[#e5e7eb] active:scale-95 disabled:opacity-50"
              )}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
