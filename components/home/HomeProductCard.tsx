"use client";

import Link from "next/link";
import { Product } from "@/types/app";
import { useSession } from "@/hooks/useSession";
import { usePrices } from "@/lib/queries/hooks";
import { PriceCard } from "@/components/prices/PriceCard";
import { PriceStats } from "@/components/prices/PriceStats";
import { LoaderDots } from "@/components/ui/LoaderDots";
import type { Price, PriceStats as PriceStatsType } from "@/types/app";

const PRICES_PREVIEW = 5;

interface HomeProductCardProps {
  product: Product;
}

export function HomeProductCard({ product }: HomeProductCardProps) {
  const { accessToken, loading: sessionLoading } = useSession();
  const { data, isLoading, isError } = usePrices({
    productId: product.id,
    sort: "price_asc",
    limit: PRICES_PREVIEW,
    sessionLoading,
    accessToken,
  });

  const prices = (data?.prices ?? []) as Price[];
  const stats: PriceStatsType = {
    avg_price: data?.stats?.avg_price ?? 0,
    median_price: data?.stats?.median_price ?? 0,
    min_price: data?.stats?.min_price ?? 0,
    report_count: data?.total ?? 0,
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
        {!isLoading && !isError && prices.length > 0 && (
          <PriceStats stats={stats} />
        )}
      </div>
      <div className="space-y-2 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <LoaderDots size="sm" />
          </div>
        ) : isError ? (
          <p className="text-mist text-xs py-2">تعذر تحميل الأسعار</p>
        ) : prices.length === 0 ? (
          <p className="text-mist text-xs py-2">لا توجد أسعار لهذا المنتج بعد</p>
        ) : (
          prices.map((price) => <PriceCard key={price.id} price={price} />)
        )}
      </div>
    </section>
  );
}
