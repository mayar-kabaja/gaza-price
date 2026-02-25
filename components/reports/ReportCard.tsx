"use client";

import Link from "next/link";
import { TrustDots } from "@/components/trust/TrustDots";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
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
    <Link
      href={report.product_id ? `/product/${report.product_id}` : "#"}
      className={cn(
        "block bg-white rounded-2xl p-3.5 border-[1.5px] border-border",
        "hover:border-olive-mid transition-colors"
      )}
    >
      {/* Row 1: category icon + product name */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg leading-none">{categoryIcon}</span>
        <span className="font-display font-bold text-sm text-ink">{productLabel}</span>
      </div>

      {/* Row 2: store · area */}
      <div className="text-xs text-mist mb-2">
        {storeName} · {report.area?.name_ar ?? "—"}
      </div>

      {/* Row 3: price (LTR) + time */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="price-number font-display font-extrabold text-lg text-olive">
          ₪ {report.price.toFixed(2)}
        </div>
        <div className={cn("text-[11px]", stale ? "text-sand" : "text-mist")}>
          {stale && "⚠️ "}
          {formatRelativeTime(report.reported_at)}
        </div>
      </div>

      {/* Row 4: trust dots + confirmation count + confirm button + receipt badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TrustDots confirmations={report.confirmation_count} />
          <span className="text-[11px] text-mist">
            {toArabicNumerals(report.confirmation_count)} {report.confirmation_count === 1 ? "تأكيد" : "تأكيدات"}
          </span>
          {report.has_receipt && (
            <span className="text-olive text-xs" title="يوجد إيصال">
              📷
            </span>
          )}
        </div>
        <div onClick={(e) => e.preventDefault()}>
          <ConfirmButton
            priceId={report.id}
            initialCount={report.confirmation_count}
            confirmedByMe={report.is_confirmed_by_me}
          />
        </div>
      </div>
    </Link>
  );
}
