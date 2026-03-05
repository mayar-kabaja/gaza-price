"use client";

import { Price } from "@/types/app";
import { TrustDots } from "@/components/trust/TrustDots";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
import { FlagButton } from "@/components/actions/FlagButton";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { useConfirmFlagExclusivity } from "@/contexts/ConfirmFlagExclusivityContext";
import { useFlagOverrides } from "@/contexts/FlagOverridesContext";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { isStale } from "@/lib/price";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  price: Price;
  /** When true, show a small loader in the confirmation area until count updates. */
  isRefetching?: boolean;
  /** Optional override (e.g. from parent state); context override takes precedence. */
  confirmationCountOverride?: number;
  /** Optional callback when user confirms (e.g. for parent state). */
  onConfirmationUpdate?: (priceId: string, newCount: number) => void;
}

export function PriceCard({ price, isRefetching = false, confirmationCountOverride, onConfirmationUpdate }: PriceCardProps) {
  const { overrides } = useConfirmationOverrides();
  const { overrides: flagOverrides } = useFlagOverrides();
  const { confirmedByMe: confirmedOverrides, flaggedByMe: flaggedOverrides } = useConfirmFlagExclusivity();
  const isConfirmedByMe = confirmedOverrides[price.id] ?? price.confirmed_by_me;
  const isFlaggedByMe = flaggedOverrides[price.id] ?? price.flagged_by_me;
  const showExclusivityHint = (isConfirmedByMe || isFlaggedByMe) && !price.is_mine;
  const storeName = price.store?.name_ar ?? price.store_name_raw ?? "متجر غير محدد";
  const stale = isStale(price.reported_at);
  const displayCount = overrides[price.id] ?? confirmationCountOverride ?? price.confirmation_count;
  const displayFlagCount = flagOverrides[price.id] ?? price.flag_count;

  return (
    <div
      className={cn(
        "bg-surface rounded-2xl p-3.5 border-[1.5px] relative",
        price.is_lowest
          ? "border-confirm bg-confirm/10"
          : "border-border"
      )}
    >
      {/* Lowest badge */}
      {price.is_lowest && (
        <div className="absolute top-0 right-0 bg-confirm text-white text-[10px] font-bold font-display px-2.5 py-0.5 rounded-br-none rounded-tl-none rounded-tr-2xl rounded-bl-2xl">
          ✓ أدنى سعر
        </div>
      )}

      {/* Main row */}
      <div className={cn("flex justify-between items-start", price.is_lowest && "mt-3")}>
        <div>
          <div className="font-display font-bold text-sm text-ink">{storeName}</div>
          <div className="text-xs text-mist mt-0.5">
            {price.area?.name_ar}
            {price.has_receipt && (
              <span className="mr-2 text-olive">📷</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="price-number font-display font-extrabold text-xl leading-none text-olive">
            {price.price.toFixed(2)}
          </div>
          <div className="text-[11px] text-mist text-left direction-ltr">₪ / {price.product?.unit ?? "كغ"}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          {isRefetching ? (
            <LoaderDots size="sm" className="inline-flex" />
          ) : (
            <>
              <TrustDots confirmations={displayCount} />
              <span className="text-[11px] text-mist">
                {toArabicNumerals(displayCount)} تأكيد
              </span>
              {displayFlagCount > 0 && (
                <span className="text-[11px] text-sand/80">
                  · {toArabicNumerals(displayFlagCount)} إبلاغ
                </span>
              )}
            </>
          )}
        </div>
        <div className={cn("text-[11px]", stale ? "text-sand" : "text-mist")}>
          {stale && "⚠️ "}
          {formatRelativeTime(price.reported_at)}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
        {price.is_mine ? (
          <span className="px-3 py-1 rounded-lg text-[11px] font-semibold font-body bg-olive/15 text-olive border border-olive/30">
            سعرك
          </span>
        ) : (
          <>
            {showExclusivityHint && (
              <div
                className="text-[10px] text-sand bg-sand-light/50 border border-sand/30 rounded-md px-2 py-1 text-right flex-1"
                role="status"
              >
                {isConfirmedByMe ? "أكّدت — لا يمكن الإبلاغ" : "أبلغت — لا يمكن التأكيد"}
              </div>
            )}
            <div className="flex items-center gap-2 mr-auto">
              <ConfirmButton
                priceId={price.id}
                productId={price.product_id}
                initialCount={price.confirmation_count}
                confirmedByMe={price.confirmed_by_me}
                flaggedByMe={price.flagged_by_me}
                onConfirmed={onConfirmationUpdate ? (newCount) => onConfirmationUpdate(price.id, newCount) : undefined}
              />
              <FlagButton
                priceId={price.id}
                initialCount={price.flag_count}
                flaggedByMe={price.flagged_by_me}
                confirmedByMe={price.confirmed_by_me}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
