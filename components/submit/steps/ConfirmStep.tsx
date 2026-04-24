"use client";

import { Product, Area } from "@/types/app";
import { ReceiptUpload } from "@/components/reports/ReceiptUpload";
import { uploadReceiptPhoto } from "@/lib/api/upload";
import { normalizeDigits } from "@/lib/normalize-digits";
import { cn } from "@/lib/utils";

interface ConfirmStepProps {
  type: "price" | "product";
  product?: Product | null;
  productName?: string;
  price: string;
  area?: Area | null;
  storeName?: string;
  receiptPhotoUrl: string | null;
  onReceiptChange: (url: string | null) => void;
  onError: (msg: string) => void;
  accessToken: string | null;
  submitting: boolean;
  storePhone: string;
  onStorePhoneChange: (val: string) => void;
  storeAddress: string;
  onStoreAddressChange: (val: string) => void;
}

/* SVG icons for summary rows */
const ICONS = {
  tag: (
    <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  price: (
    <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
};

export function ConfirmStep({
  type,
  product,
  productName,
  price,
  area,
  storeName,
  receiptPhotoUrl,
  onReceiptChange,
  onError,
  accessToken,
  submitting,
  storePhone,
  onStorePhoneChange,
  storeAddress,
  onStoreAddressChange,
}: ConfirmStepProps) {
  const displayName = type === "price"
    ? product?.name_ar ?? "—"
    : productName || "—";

  const rows: { label: string; value: string; isPrice?: boolean; icon: React.ReactNode }[] = [];
  rows.push({ label: type === "price" ? "المنتج" : "اسم المنتج", value: displayName, icon: ICONS.tag });
  if (price) rows.push({ label: "السعر", value: `${price} ₪`, isPrice: true, icon: ICONS.price });
  if (storeName) rows.push({ label: "المحل", value: storeName, icon: ICONS.store });
  if (area) rows.push({ label: "المنطقة", value: area.name_ar, icon: ICONS.pin });

  return (
    <div className="space-y-3">
      {/* Summary card */}
      <div className="bg-surface border border-border rounded-[16px] overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-4 py-3 ${i < rows.length - 1 ? "border-b border-border/50" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-mist">
              {row.icon}
              <span className="text-[12px]">{row.label}</span>
            </div>
            <span
              className={
                row.isPrice
                  ? "font-display font-black text-lg text-olive price-number"
                  : "text-sm font-bold text-ink"
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Optional extras */}
      <div className="text-[12px] font-semibold text-mist mb-1 pr-0.5">تفاصيل إضافية (اختياري)</div>
      <div className="space-y-3">
        {/* Store address */}
        <div>
          <div className="text-[11px] font-semibold text-mist mb-1.5 pr-0.5">عنوان المتجر</div>
          <input
            type="text"
            value={storeAddress}
            onChange={(e) => onStoreAddressChange(e.target.value)}
            placeholder="مثال: شارع الجلاء بجانب مسجد العمري"
            className="w-full bg-surface border-[1.5px] border-border rounded-[12px] px-3.5 py-2.5 text-[13px] font-body text-ink outline-none focus:border-olive transition-colors"
            dir="rtl"
          />
        </div>

        {/* Store phone */}
        <div>
          <div className="text-[11px] font-semibold text-mist mb-1.5 pr-0.5">رقم هاتف المتجر</div>
          <input
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={storePhone}
            onChange={(e) => onStorePhoneChange(normalizeDigits(e.target.value))}
            placeholder="مثال: 0599123456"
            className="w-full bg-surface border-[1.5px] border-border rounded-[12px] px-3.5 py-2.5 text-[13px] font-body text-ink outline-none focus:border-olive text-left transition-colors"
          />
        </div>
      </div>

      {/* Receipt upload */}
      <ReceiptUpload
        value={receiptPhotoUrl}
        onChange={onReceiptChange}
        onError={onError}
        uploadFn={(file) => uploadReceiptPhoto(file, accessToken)}
        disabled={submitting}
      />

      {/* Tip */}
      <div
        className="rounded-[14px] px-4 py-3.5 flex items-start gap-2.5"
        style={{ background: "#E8F5EE", border: "1px solid rgba(30,77,43,0.15)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E4D2B" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <div className="text-[12px] leading-relaxed" style={{ color: "#1E4D2B" }}>
          مساهمتك ستساعد أهل غزة يعرفوا الأسعار الحقيقية. شكراً لك.
        </div>
      </div>
    </div>
  );
}
