"use client";

import { useState } from "react";
import { Price } from "@/types/app";
import { TrustDots } from "@/components/trust/TrustDots";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
import { FlagButton } from "@/components/actions/FlagButton";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { useConfirmFlagExclusivity } from "@/contexts/ConfirmFlagExclusivityContext";
import { normalizeDigits } from "@/lib/normalize-digits";
import { useFlagOverrides } from "@/contexts/FlagOverridesContext";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { isStale } from "@/lib/price";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  price: Price;
  isRefetching?: boolean;
  confirmationCountOverride?: number;
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

  const isDemo = !!price.is_demo;
  const store_address = price.store_address;
  const store_phone = price.store_phone ? normalizeDigits(price.store_phone) : price.store_phone;
  const hasDetails = !!(store_address || store_phone);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl px-3.5 py-2.5 relative overflow-hidden bg-surface",
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

      {/* Main row */}
      <div className={cn("flex justify-between items-start", (price.is_lowest || isDemo) && "mt-3")}>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm text-ink">
            {storeName}
          </div>
          <div className="text-xs text-mist mt-0.5">
            {price.area?.name_ar}
            {price.has_receipt && (
              <span className="mr-2 text-olive">📷</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 mr-3">
          <div className="price-number font-display font-extrabold text-xl leading-none text-olive">
            {price.price.toFixed(2)}
          </div>
          <div className="text-[11px] text-mist text-left direction-ltr">₪ / {price.product?.unit ?? "كغ"}</div>
        </div>
      </div>

      {/* Store details toggle */}
      {hasDetails && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] text-olive/60 hover:text-olive transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{detailsOpen ? "إخفاء التفاصيل" : "عرض العنوان والهاتف"}</span>
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("transition-transform duration-200", detailsOpen && "rotate-180")}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Expandable panel */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              detailsOpen ? "max-h-40 opacity-100 mt-1.5" : "max-h-0 opacity-0"
            )}
          >
            <div
              className="px-3 py-2.5 space-y-2 text-[12px] border"
              style={{ background: "var(--details-bg)", borderColor: "var(--details-border)", borderRadius: 10 }}
            >
              {store_address && (
                <div className="flex items-start gap-2 text-ink">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-olive/70">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="leading-relaxed">{store_address}</span>
                </div>
              )}
              {store_phone && (
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-olive/70">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <a href={`tel:${store_phone}`} className="text-olive hover:underline" dir="ltr">
                    {store_phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className={cn("flex items-center justify-between", hasDetails ? "mt-1.5" : "mt-2")}>
        <div className={cn("text-[11px]", stale ? "text-sand" : "text-mist")}>
          {stale && "⚠️ "}
          {formatRelativeTime(price.reported_at)}
        </div>
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
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/50">
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
