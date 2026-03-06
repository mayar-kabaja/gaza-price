"use client";

import Link from "next/link";
import { TrustDots } from "@/components/trust/TrustDots";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
import { FlagButton } from "@/components/actions/FlagButton";
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
  const productLabel = product
    ? `${product.name_ar} · ${toArabicNumerals(product.unit_size)} ${product.unit}`
    : "—";
  const stale = isStale(report.reported_at);

  return (
    <div className="bg-surface rounded-2xl p-3.5 border-[1.5px] border-border">
      <Link
        href={report.product_id ? `/product/${report.product_id}` : "#"}
        className="block focus:outline-none"
      >
        {/* Main row: product info + price */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{categoryIcon}</span>
              <span className="font-display font-bold text-sm text-ink">{productLabel}</span>
            </div>
            <div className="text-xs text-mist mt-0.5">
              {storeName}
              {report.has_receipt && (
                <span className="mr-2 text-olive">📷</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="price-number font-display font-extrabold text-xl leading-none text-olive">
              {report.price.toFixed(2)}
            </div>
            <div className="text-[11px] text-mist text-left direction-ltr">₪ / {product?.unit ?? "كغ"}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5">
            <TrustDots confirmations={report.confirmation_count} />
            <span className="text-[11px] text-mist">
              {toArabicNumerals(report.confirmation_count)} تأكيد
            </span>
            {report.flag_count > 0 && (
              <span className="text-[11px] text-sand/80">
                · {toArabicNumerals(report.flag_count)} {report.flag_count === 1 ? "إبلاغ" : "إبلاغات"}
              </span>
            )}
          </div>
          <div className={cn("text-[11px]", stale ? "text-sand" : "text-mist")}>
            {stale && "⚠️ "}
            {formatRelativeTime(report.reported_at)}
          </div>
        </div>
      </Link>

      {/* Actions row */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
        {report.is_mine ? (
          <span className="px-3 py-1 rounded-lg text-[11px] font-semibold font-body bg-olive/15 text-olive border border-olive/30">
            سعرك
          </span>
        ) : (
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
        )}
      </div>
    </div>
  );
}
