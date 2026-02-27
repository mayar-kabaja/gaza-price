import { Price } from "@/types/app";
import { TrustDots } from "@/components/trust/TrustDots";
import { ConfirmButton } from "@/components/actions/ConfirmButton";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { isStale } from "@/lib/price";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  price: Price;
}

export function PriceCard({ price }: PriceCardProps) {
  const storeName = price.store?.name_ar ?? price.store_name_raw ?? "متجر غير محدد";
  const stale = isStale(price.reported_at);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-3.5 border-[1.5px] relative",
        price.is_lowest
          ? "border-confirm bg-[#F2FBF6]"
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

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <TrustDots confirmations={price.confirmation_count} />
            <span className="text-[11px] text-mist">
              {toArabicNumerals(price.confirmation_count)} تأكيد
            </span>
          </div>
          <div className={cn("text-[11px] mt-0.5", stale ? "text-sand" : "text-mist")}>
            {stale && "⚠️ "}
            {formatRelativeTime(price.reported_at)}
          </div>
        </div>
        <ConfirmButton
          priceId={price.id}
          initialCount={price.confirmation_count}
          confirmedByMe={price.confirmed_by_me}
        />
      </div>
    </div>
  );
}
