"use client";

import { useFlag } from "@/hooks/useFlag";
import { toArabicNumerals } from "@/lib/arabic";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

interface FlagButtonProps {
  priceId: string;
  initialCount: number;
  flaggedByMe?: boolean;
  confirmedByMe?: boolean;
  onFlagged?: (flagged: boolean, newCount: number) => void;
}

export function FlagButton({ priceId, initialCount, flaggedByMe = false, confirmedByMe = false, onFlagged }: FlagButtonProps) {
  const { count, flagged, loading, error, setError, toggle } = useFlag(initialCount, priceId, {
    initialFlagged: flaggedByMe,
    onSuccess: (newFlagged, newCount) => {
      onFlagged?.(newFlagged, newCount);
    },
  });

  const disabled = loading;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          playSound("flag");
          setTimeout(() => toggle(flagged ? undefined : "other"), 0);
        }}
        disabled={disabled}
        className={cn(
          "px-2.5 py-1 rounded-md text-[11px] font-semibold font-body transition-all leading-tight",
          flagged
            ? "bg-sand/20 text-sand border border-sand/40 hover:bg-sand/30 active:scale-95"
            : "bg-surface border border-border text-mist hover:border-sand hover:bg-sand/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? "جاري..." : flagged ? `🚩 أبلغت (${toArabicNumerals(count)})` : "🚩 إبلاغ"}
      </button>
      {error && (
        <ApiErrorBox message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
