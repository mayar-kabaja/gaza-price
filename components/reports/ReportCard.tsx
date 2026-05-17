"use client";

import { useState } from "react";
import Link from "next/link";
import { TrustDots } from "@/components/trust/TrustDots";
import { VoteButtons } from "@/components/actions/VoteButtons";
import { useVote } from "@/hooks/useVote";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { normalizeDigits } from "@/lib/normalize-digits";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { isStale } from "@/lib/price";
import type { ReportFeedItem } from "@/types/app";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  report: ReportFeedItem;
}

export function ReportCard({ report }: ReportCardProps) {
  const storeName = report.store?.name_ar ?? report.store_name_raw ?? "متجر غير محدد";
  const product = report.product;
  const categoryIcon = product?.category?.icon ?? "📦";
  const productLabel = product?.name_ar ?? "—";
  const stale = isStale(report.reported_at);

  const { myVote, confirmCount, flagCount, loading, error, setError, vote } = useVote(report.id, {
    initialVote: report.my_vote,
    initialConfirmCount: report.confirmation_count,
    initialFlagCount: report.flag_count,
  });

  const isDemo = !!report.is_demo;
  const store_address = report.store_address;
  const store_phone = report.store_phone ? normalizeDigits(report.store_phone) : report.store_phone;
  const hasDetails = !!(store_address || store_phone);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl px-3 pt-2.5 pb-1.5 relative overflow-hidden bg-surface border-[1.5px] border-border hover:border-olive/30 hover:shadow-sm transition-all duration-200 flex flex-col h-full"
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

      {/* Product name + price row */}
      <div className={cn("flex justify-between items-center", isDemo && "mt-2")}>
        <Link
          href={report.product_id ? `/product/${report.product_id}` : "#"}
          className="font-display font-bold text-sm text-ink hover:text-olive transition-colors truncate focus:outline-none"
        >
          {productLabel}
        </Link>
        <div className="flex items-baseline gap-1 flex-shrink-0 mr-3">
          <div className="price-number font-display font-extrabold text-base leading-none text-olive">
            {report.price.toFixed(2)}
          </div>
          <div className="text-[11px] text-mist">₪ / {product?.unit ?? "كغ"}</div>
        </div>
      </div>

      {/* Store info */}
      <div className="mt-1">
        <div className="font-display font-medium text-xs text-ink">{storeName}</div>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] text-olive/60 hover:text-olive transition-colors mt-0.5"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{detailsOpen ? "إخفاء العنوان والهاتف" : "عرض العنوان والهاتف"}</span>
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
        {detailsOpen && (
          <div className="mt-1 text-[11px]">
            <div className="text-mist truncate">
              {report.area?.name_ar}{store_address ? ` - ${store_address}` : ""}
            </div>
            {store_phone && (
              <a href={`tel:${store_phone}`} className="text-olive hover:underline block text-right" dir="ltr">
                {store_phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Spacer to push footer to bottom */}
      <div className="flex-1" />

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
        <div className="text-[10px] text-mist">
          {formatRelativeTime(report.reported_at)}
        </div>
        <div className="flex items-center gap-2">
          {report.is_mine ? (
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
