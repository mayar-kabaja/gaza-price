"use client";

import { useEffect } from "react";
import { useProductNameValidation } from "@/hooks/useProductNameValidation";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onValidityChange?: (isValid: boolean) => void;
}

export function ProductNameInput({ value, onChange, onValidityChange }: Props) {
  const validation = useProductNameValidation(value);

  const hasSuggestion = validation.status === "valid" && !!validation.suggestion;

  useEffect(() => {
    onValidityChange?.(validation.status !== "invalid");
  }, [validation.status, onValidityChange]);

  const borderClass = {
    idle: "border-border",
    checking: "border-olive-mid",
    valid: "border-border",
    invalid: "border-[#C0622A] shadow-[0_0_0_3px_rgba(192,98,42,0.10)] animate-[shake-input_0.38s_ease]",
    error: "border-border",
  }[validation.status];

  return (
    <div className="flex flex-col gap-[5px]">
      {/* Label */}
      <div className="flex items-center gap-1.5 pr-0.5">
        <span className="text-[11px] font-semibold text-mist">اسم المنتج</span>
      </div>

      {/* Input wrap */}
      <div
        className={`flex items-center bg-surface rounded-xl border-[1.5px] transition-all duration-200 overflow-hidden ${borderClass}`}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="مثال: دقيق بلدي، زيت زيتون، حليب نيدو..."
          dir="rtl"
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          className={`flex-1 py-3 px-3.5 text-sm font-body bg-transparent outline-none text-right placeholder:text-mist placeholder:text-[13px] ${
            validation.status === "invalid" ? "text-[#C0622A]" : "text-ink"
          }`}
        />
        <div className="px-2.5 flex-shrink-0 flex items-center gap-1.5">
          {validation.status === "checking" && (
            <>
              <span className="text-[10px] text-olive whitespace-nowrap">AI يتحقق...</span>
              <SpinRing />
            </>
          )}
          {validation.status === "valid" && !hasSuggestion && (
            <span className="text-[10px] text-confirm whitespace-nowrap">AI ✓</span>
          )}
          {validation.status === "invalid" && (
            <span className="text-[10px] text-[#C0622A] whitespace-nowrap">
              {validation.reason || "اسم غير صالح"}
            </span>
          )}
          {validation.status === "valid" && hasSuggestion && (
            <button
              type="button"
              onClick={() => onChange(validation.suggestion!)}
              className="text-[10px] text-[#C9A96E] whitespace-nowrap hover:underline cursor-pointer"
            >
              هل تقصد: {validation.suggestion}؟
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shake-input {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

function SpinRing() {
  return <div className="w-3.5 h-3.5 border-[1.5px] border-olive-mid border-t-olive rounded-full animate-spin" />;
}
