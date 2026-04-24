"use client";

import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onValidityChange?: (isValid: boolean) => void;
}

export function ProductNameInput({ value, onChange, onValidityChange }: Props) {
  useEffect(() => {
    onValidityChange?.(value.trim().length >= 2);
  }, [value, onValidityChange]);

  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex items-center gap-1.5 pr-0.5">
        <span className="text-[11px] font-semibold text-mist">اسم المنتج</span>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: دقيق بلدي، زيت زيتون، حليب نيدو..."
        dir="rtl"
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        className="w-full py-3 px-3.5 text-sm font-body bg-surface rounded-xl border-[1.5px] border-border outline-none text-right text-ink placeholder:text-mist placeholder:text-[13px] focus:border-olive transition-colors"
      />
    </div>
  );
}
