"use client";

import { Price } from "@/types/app";
import { TrustDots } from "@/components/trust/TrustDots";
import { VoteButtons } from "@/components/actions/VoteButtons";
import { useVote } from "@/hooks/useVote";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { normalizeDigits } from "@/lib/normalize-digits";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { isStale } from "@/lib/price";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  price: Price;
  isRefetching?: boolean;
}

export function PriceCard({ price, isRefetching = false }: PriceCardProps) {
  const storeName = price.store?.name_ar ?? price.store_name_raw ?? "متجر غير محدد";
  const stale = isStale(price.reported_at);

  const isDemo = !!price.is_demo;
  const store_address = price.store_address;
  const store_phone = price.store_phone ? normalizeDigits(price.store_phone) : price.store_phone;

  const { myVote, confirmCount, flagCount, loading, error, setError, vote } = useVote(price.id, {
    initialVote: price.my_vote,
    initialConfirmCount: price.confirmation_count,
    initialFlagCount: price.flag_count,
  });

  return (
    <div
      className={cn(
        "rounded-2xl px-3.5 py-2.5 relative overflow-hidden bg-surface flex flex-col h-full",
        price.is_lowest ? "border-[0.5px] border-confirm bg-confirm/10" : "border-[1.5px] border-border"
      )}
    >
      {/* Lowest badge */}
      {price.is_lowest && (
        <div className="absolute top-0 right-0 bg-confirm text-white text-[10px] font-bold font-display px-2.5 py-0.5 rounded-br-none rounded-tl-none rounded-tr-2xl rounded-bl-2xl">
          ✓ أدنى سعر
        </div>
      )}

      {/* Demo badge */}
      {isDemo && (
        <div
          className="absolute top-0 left-0 text-white text-[9px] font-bold font-display px-2 py-[3px] z-[2] demo-badge"
          style={{ borderRadius: "0 0 10px 0" }}
        >
          تجريبي
        </div>
      )}

      {/* Product name + price row */}
      <div className={cn("flex justify-between items-center", (price.is_lowest || isDemo) && "mt-3")}>
        <div className="font-display font-bold text-sm text-ink truncate">
          {price.product?.name_ar}
        </div>
        <div className="flex items-baseline gap-1 flex-shrink-0 mr-3">
          <div className="price-number font-display font-extrabold text-xl leading-none text-olive">
            {price.price.toFixed(2)}
          </div>
          <div className="text-[11px] text-mist">₪ / {price.product?.unit ?? "كغ"}</div>
        </div>
      </div>

      {/* Store info */}
      <div className="mt-1">
        <div className="font-display font-medium text-xs text-ink">{storeName}</div>
        {store_address ? (
          <div className="text-[11px] text-mist truncate">{store_address}</div>
        ) : (
          <div className="text-[11px] text-mist">{price.area?.name_ar}</div>
        )}
        {store_phone && (
          <a href={`tel:${store_phone}`} className="text-[11px] text-olive hover:underline block" dir="ltr">
            {store_phone}
          </a>
        )}
      </div>

      {/* Spacer to push footer to bottom */}
      <div className="flex-1" />

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
        <div className="text-[11px] text-mist">
          {formatRelativeTime(price.reported_at)}
        </div>
        <div className="flex items-center gap-2">
          {price.is_mine ? (
            <span className="px-3 py-1 rounded-lg text-[11px] font-semibold font-body bg-olive/15 text-olive border border-olive/30">
              سعرك
            </span>
          ) : (
            <VoteButtons myVote={myVote} loading={loading} error={error} setError={setError} vote={vote} />
          )}
        </div>
      </div>
    </div>
  );
}
