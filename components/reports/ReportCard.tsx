"use client";

import { useState } from "react";
import Link from "next/link";
import { TrustDots } from "@/components/trust/TrustDots";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
import { FlagButton } from "@/components/actions/FlagButton";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { useConfirmFlagExclusivity } from "@/contexts/ConfirmFlagExclusivityContext";
import { normalizeDigits } from "@/lib/normalize-digits";
import { useFlagOverrides } from "@/contexts/FlagOverridesContext";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { isStale } from "@/lib/price";
import type { ReportFeedItem } from "@/types/app";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  report: ReportFeedItem;
}

export function ReportCard({ report }: ReportCardProps) {
  const { overrides } = useConfirmationOverrides();
  const { overrides: flagOverrides } = useFlagOverrides();
  const { confirmedByMe: confirmedOverrides, flaggedByMe: flaggedOverrides } = useConfirmFlagExclusivity();
  const isConfirmedByMe = confirmedOverrides[report.id] ?? report.is_confirmed_by_me;
  const isFlaggedByMe = flaggedOverrides[report.id] ?? report.is_flagged_by_me;
  const showExclusivityHint = (isConfirmedByMe || isFlaggedByMe) && !report.is_mine;

  const storeName = report.store?.name_ar ?? report.store_name_raw ?? "متجر غير محدد";
  const product = report.product;
  const categoryIcon = product?.category?.icon ?? "📦";
  const productLabel = product
    ? `${product.name_ar} · ${toArabicNumerals(product.unit_size)} ${product.unit}`
    : "—";
  const stale = isStale(report.reported_at);
  const displayCount = overrides[report.id] ?? report.confirmation_count;
  const displayFlagCount = flagOverrides[report.id] ?? report.flag_count;

  const isDemo = !!report.is_demo;
  const store_address = report.store_address;
  const store_phone = report.store_phone ? normalizeDigits(report.store_phone) : report.store_phone;
  const hasDetails = !!(store_address || store_phone);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl px-3 pt-2.5 pb-1.5 relative overflow-hidden bg-surface border-[1.5px] border-border hover:border-olive/30 hover:shadow-sm transition-all duration-200"
      )}
    >
      {/* Demo badge */}
      {isDemo && (
        <div
          className="absolute top-0 left-0 text-white text-[9px] font-bold font-display px-2 py-[3px] z-[2] demo-badge"
          style={{ borderRadius: "0 0 10px 0" }}
        >
          تجريبي
        </div>
      )}

      {/* Product name row */}
      <Link
        href={report.product_id ? `/product/${report.product_id}` : "#"}
        className={cn("flex items-center gap-1 mb-0.5 focus:outline-none", isDemo && "mt-2")}
      >
        <span className="text-sm leading-none">{categoryIcon}</span>
        <span className="font-display font-bold text-xs text-ink hover:text-olive transition-colors">{productLabel}</span>
      </Link>

      {/* Main row: store + price */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-xs text-ink">
            {storeName}
          </div>
          <div className="text-[11px] text-mist">
            {report.area?.name_ar}
            {report.has_receipt && (
              <span className="mr-2 text-olive">📷</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 mr-3">
          <div className="price-number font-display font-extrabold text-base leading-none text-olive">
            {report.price.toFixed(2)}
          </div>
          <div className="text-[10px] text-mist text-left direction-ltr">₪ / {product?.unit ?? "كغ"}</div>
        </div>
      </div>

      {/* Store details toggle */}
      {hasDetails && (
        <div className="mt-1.5">
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
      <div className={cn("flex items-center justify-between", hasDetails ? "mt-1" : "mt-1.5")}>
        <div className={cn("text-[10px]", stale ? "text-sand" : "text-mist")}>
          {stale && "⚠️ "}
          {formatRelativeTime(report.reported_at)}
        </div>
        <div className="flex items-center gap-1.5">
          <TrustDots confirmations={displayCount} />
          <span className="text-[10px] text-mist">
            {toArabicNumerals(displayCount)} تأكيد
          </span>
          {displayFlagCount > 0 && (
            <span className="text-[10px] text-sand/80">
              · {toArabicNumerals(displayFlagCount)} إبلاغ
            </span>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border/50">
        {report.is_mine ? (
          <span className="px-3 py-1 rounded-lg text-[11px] font-semibold font-body bg-olive/15 text-olive border border-olive/30">
            سعرك
          </span>
        ) : (
          <>
            <div className="flex items-center gap-2 mr-auto">
              <ConfirmButton
                priceId={report.id}
                productId={report.product_id}
                initialCount={report.confirmation_count}
                confirmedByMe={report.is_confirmed_by_me}
                flaggedByMe={report.is_flagged_by_me}
              />
              <FlagButton
                priceId={report.id}
                initialCount={report.flag_count}
                flaggedByMe={report.is_flagged_by_me}
                confirmedByMe={report.is_confirmed_by_me}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
