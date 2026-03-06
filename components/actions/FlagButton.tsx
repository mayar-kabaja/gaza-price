"use client";

import { useFlag } from "@/hooks/useFlag";
import { useFlagOverrides } from "@/contexts/FlagOverridesContext";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { useConfirmFlagExclusivity } from "@/contexts/ConfirmFlagExclusivityContext";
import { toArabicNumerals } from "@/lib/arabic";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

interface FlagButtonProps {
  priceId: string;
  initialCount: number;
  flaggedByMe?: boolean;
  /** When true, disable (user can't flag if they've confirmed). */
  confirmedByMe?: boolean;
  onFlagged?: (flagged: boolean, newCount: number) => void;
}

export function FlagButton({ priceId, initialCount, flaggedByMe = false, confirmedByMe = false, onFlagged }: FlagButtonProps) {
  const { setOverride } = useFlagOverrides();
  const { setOverride: setConfirmOverride } = useConfirmationOverrides();
  const { confirmedByMe: confirmedOverrides, setConfirmedByMe, setFlaggedByMe } = useConfirmFlagExclusivity();
  const { count, flagged, loading, error, setError, toggle } = useFlag(initialCount, priceId, {
    initialFlagged: flaggedByMe,
    onSuccess: (newFlagged, newCount, extra) => {
      setOverride(priceId, newCount);
      if (extra?.confirmation_count !== undefined) setConfirmOverride(priceId, extra.confirmation_count);
      setFlaggedByMe(priceId, newFlagged);
      setConfirmedByMe(priceId, false);
      onFlagged?.(newFlagged, newCount);
    },
  });

  const isConfirmedByMe = confirmedOverrides[priceId] ?? confirmedByMe;
  const disabled = loading || isConfirmedByMe;

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
        title={isConfirmedByMe ? "لا يمكن الإبلاغ لأنك أكّدت هذا السعر" : undefined}
        className={cn(
          "px-2.5 py-1 rounded-md text-[11px] font-semibold font-body transition-all leading-tight",
          flagged
            ? "bg-sand/20 text-sand border border-sand/40"
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
