"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const ARABIC_DIGITS = /[٠-٩]/g;
const ARABIC_TO_ENGLISH: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function normalizePriceInput(value: string): string {
  return value.replace(ARABIC_DIGITS, (d) => ARABIC_TO_ENGLISH[d] ?? d);
}

const QUICK_PRICES = [5, 10, 15, 20, 25, 30, 50];

interface PriceInputStepProps {
  price: string;
  onPriceChange: (val: string) => void;
  onQuickSelect?: () => void;
  unitLabel?: string;
}

export function PriceInputStep({ price, onPriceChange, onQuickSelect, unitLabel }: PriceInputStepProps) {
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (toastRef.current) clearTimeout(toastRef.current); };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast(msg);
    toastRef.current = setTimeout(() => { setToast(null); toastRef.current = null; }, 3000);
  }, []);

  return (
    <div>
      {/* Price display */}
      <div className="relative bg-surface border-2 border-border rounded-[22px] pt-8 pb-6 px-5 text-center mb-6 transition-colors focus-within:border-olive">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="font-display font-bold text-[20px] text-mist/60">₪</span>
          <input
            type="text"
            inputMode="decimal"
            lang="en"
            dir="ltr"
            value={price}
            onChange={(e) => {
              const raw = e.target.value;
              if (ARABIC_DIGITS.test(raw)) {
                showToast("استخدم الأرقام الإنجليزية (0-9) فقط");
                onPriceChange(normalizePriceInput(raw));
              } else {
                onPriceChange(raw);
              }
            }}
            placeholder="0"
            className="w-[120px] text-center font-display font-black text-[48px] text-ink bg-transparent outline-none price-number leading-none"
            autoFocus
          />
        </div>
        {unitLabel && (
          <div className="text-[12px] text-mist mt-2 font-semibold">لكل {unitLabel}</div>
        )}
      </div>

      {/* Quick prices label */}
      <div className="text-[11px] font-semibold text-mist mb-2.5 text-right pr-1">أو اختر سعر سريع</div>

      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {QUICK_PRICES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              onPriceChange(String(v));
              setTimeout(() => onQuickSelect?.(), 260);
            }}
            className={cn(
              "min-w-[60px] px-4 py-2.5 rounded-full text-[14px] font-bold transition-all active:scale-95",
              price === String(v)
                ? "bg-olive text-white shadow-[0_2px_8px_rgba(30,77,43,0.3)]"
                : "bg-surface border-[1.5px] border-border text-ink/60 hover:border-olive/40 hover:text-olive"
            )}
          >
            {v}₪
          </button>
        ))}
      </div>

      {toast && (
        <div
          className="mt-5 rounded-[14px] px-4 py-2.5 text-center text-xs text-white"
          style={{ background: "rgba(15,23,42,0.9)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
