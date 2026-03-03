"use client";

import { useSession } from "@/hooks/useSession";
import { usePrices } from "@/lib/queries/hooks";
import { PriceList } from "@/components/prices/PriceList";
import { LoaderDots } from "@/components/ui/LoaderDots";
import type { PriceStats as PriceStatsType } from "@/types/app";

interface ProductPricesSectionProps {
  productId: string;
  productName: string;
  areaId?: string | null;
}

export function ProductPricesSection({ productId, productName, areaId }: ProductPricesSectionProps) {
  const { accessToken, loading: sessionLoading } = useSession();
  const { data, isLoading, isError, isFetching, isPending } = usePrices({
    productId,
    areaId,
    sort: "price_asc",
    limit: 50,
    sessionLoading,
    accessToken,
  });

  const prices = data?.prices ?? [];

  // Compute from loaded prices as fallback when backend stats are missing/zero
  const priceValues = prices.map((p: { price: number | string }) => Number(p.price)).filter((v) => v > 0);
  const fallbackAvg = priceValues.length > 0
    ? priceValues.reduce((sum, v) => sum + v, 0) / priceValues.length
    : 0;
  const fallbackMin = priceValues.length > 0
    ? Math.min(...priceValues)
    : 0;

  const backendAvg = Number(data?.stats?.avg_price) || 0;
  const backendMedian = Number(data?.stats?.median_price) || 0;
  const backendMin = Number(data?.stats?.min_price) || 0;

  const stats: PriceStatsType = {
    avg_price: backendAvg > 0 ? backendAvg : fallbackAvg,
    median_price: backendMedian > 0 ? backendMedian : fallbackAvg,
    min_price: backendMin > 0 ? backendMin : fallbackMin,
    report_count: data?.total ?? prices.length ?? 0,
  };

  if (sessionLoading || isLoading || (isPending && !data)) {
    return (
      <div className="px-4 flex justify-center py-12">
        <LoaderDots size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="px-4 py-4 text-mist text-sm">تعذر تحميل الأسعار، جرّب تحديث الصفحة</p>
    );
  }

  return <PriceList prices={prices} stats={stats} productName={productName} isRefetching={isFetching} />;
}
