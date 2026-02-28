"use client";

import Link from "next/link";
import { Product, PricePreviewItem } from "@/types/app";
import { useSession } from "@/hooks/useSession";
import { usePrices } from "@/lib/queries/hooks";
import { PriceCard } from "@/components/prices/PriceCard";
import { PriceStats } from "@/components/prices/PriceStats";
import { LoaderDots } from "@/components/ui/LoaderDots";
import type { Price, PriceStats as PriceStatsType } from "@/types/app";

const PRICES_PREVIEW = 5;

/** Build a Price-like object from price_preview item for PriceCard. */
function previewToPrice(p: PricePreviewItem, product: Product, isLowest: boolean): Price {
  return {
    id: p.id,
    product_id: product.id,
    product: { id: product.id, name_ar: product.name_ar, category_id: product.category_id, unit: product.unit, unit_size: product.unit_size, status: "active", created_at: product.created_at },
    store: p.store ? { id: "", name_ar: p.store.name_ar ?? "", area_id: "", is_verified: false } : undefined,
    store_name_raw: undefined,
    area_id: "",
    area: p.area ? { id: "", name_ar: p.area.name_ar ?? "", governorate: "central", is_active: true } : undefined,
    price: p.price,
    currency: "ILS",
    status: "confirmed",
    trust_score: 0,
    confirmation_count: p.confirmation_count,
    flag_count: 0,
    has_receipt: false,
    is_lowest: isLowest,
    reported_at: p.reported_at,
    expires_at: "",
    confirmed_by_me: p.confirmed_by_me,
    is_mine: p.is_mine,
  };
}

interface HomeProductCardProps {
  product: Product;
  isRefetching?: boolean;
}

export function HomeProductCard({ product, isRefetching = false }: HomeProductCardProps) {
  const { accessToken, loading: sessionLoading } = useSession();
  const hasPricePreview = Array.isArray(product.price_preview) && product.price_preview.length > 0;

  const { data, isLoading, isError } = usePrices({
    productId: product.id,
    sort: "price_asc",
    limit: PRICES_PREVIEW,
    sessionLoading: hasPricePreview ? true : sessionLoading,
    accessToken,
  });

  const pricesFromPreview = hasPricePreview
    ? (product.price_preview!.map((p, i) => {
        const minPrice = Math.min(...product.price_preview!.map((x) => x.price));
        return previewToPrice(p, product, p.price === minPrice);
      }) as Price[])
    : [];
  const pricesFromFetch = (data?.prices ?? []) as Price[];
  const prices = hasPricePreview ? pricesFromPreview : pricesFromFetch;
  const showLoading = !hasPricePreview && isLoading;

  const total = data?.total ?? product.price_preview?.length ?? 0;
  const minPrice = prices.length > 0 ? Math.min(...prices.map((x) => x.price)) : 0;
  const stats: PriceStatsType = {
    avg_price: data?.stats?.avg_price ?? 0,
    median_price: data?.stats?.median_price ?? 0,
    min_price: data?.stats?.min_price ?? minPrice,
    report_count: total,
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-2 mb-2 px-4">
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
      <div className="space-y-2 px-4">
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
}
