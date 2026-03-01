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
  const stats: PriceStatsType = {
    avg_price: data?.stats?.avg_price ?? 0,
    median_price: data?.stats?.median_price ?? 0,
    min_price: data?.stats?.min_price ?? 0,
    report_count: data?.total ?? 0,
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
