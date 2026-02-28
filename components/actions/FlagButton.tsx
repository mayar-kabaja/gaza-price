"use client";

import { useFlag } from "@/hooks/useFlag";
import { useFlagOverrides } from "@/contexts/FlagOverridesContext";
import { toArabicNumerals } from "@/lib/arabic";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";

interface FlagButtonProps {
  priceId: string;
  initialCount: number;
  flaggedByMe?: boolean;
  onFlagged?: (flagged: boolean, newCount: number) => void;
}

export function FlagButton({ priceId, initialCount, flaggedByMe = false, onFlagged }: FlagButtonProps) {
  const { setOverride } = useFlagOverrides();
  const { count, flagged, loading, error, setError, toggle } = useFlag(initialCount, priceId, {
    initialFlagged: flaggedByMe,
    onSuccess: (newFlagged, newCount) => {
      setOverride(priceId, newCount);
      onFlagged?.(newFlagged, newCount);
    },
  });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => toggle(flagged ? undefined : "other"), 0);
        }}
        disabled={loading}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all",
          flagged
            ? "bg-sand/20 text-sand border border-sand/40"
            : "bg-white border border-border text-mist hover:border-sand hover:bg-sand/5 active:scale-95 disabled:opacity-70"
        )}
      >
        {loading ? "جاري..." : flagged ? `🚩 أبلغت (${toArabicNumerals(count)})` : "🚩 أبلغ عن السعر"}
      </button>
      {error && (
        <ApiErrorBox message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
