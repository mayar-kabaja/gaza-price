import { Price, PriceStats as PriceStatsType } from "@/types/app";
import { PriceCard } from "./PriceCard";
import { PriceStats } from "./PriceStats";

interface PriceListProps {
  prices: Price[];
  stats: PriceStatsType;
  productName: string;
  isRefetching?: boolean;
}

export function PriceList({ prices, stats, productName, isRefetching = false }: PriceListProps) {
  return (
    <div className="px-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="font-display font-bold text-sm text-ink shrink-0">{productName}</h2>
        <PriceStats stats={stats} />
      </div>
      <div className="space-y-2">
        {prices.map((price) => (
          <PriceCard key={price.id} price={price} isRefetching={isRefetching} />
        ))}
        {prices.length === 0 && (
          <p className="text-left py-4 text-mist text-xs w-fit max-w-full">
            لا توجد أسعار لهذا المنتج بعد
          </p>
        )}
      </div>
    </div>
  );
}
