"use client";

import { useConfirm } from "@/hooks/useConfirm";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { useConfirmFlagExclusivity } from "@/contexts/ConfirmFlagExclusivityContext";
import { useFlagOverrides } from "@/contexts/FlagOverridesContext";
import { toArabicNumerals } from "@/lib/arabic";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  priceId: string;
  productId: string;
  initialCount: number;
  /** When true, show as already confirmed by current user (e.g. in feed). */
  confirmedByMe?: boolean;
  /** When true, disable (user can't confirm if they've flagged). */
  flaggedByMe?: boolean;
  /** Optional extra callback when confirm succeeds (e.g. for local state). */
  onConfirmed?: (newCount: number) => void;
}

export function ConfirmButton({ priceId, productId, initialCount, confirmedByMe = false, flaggedByMe = false, onConfirmed }: ConfirmButtonProps) {
  const { setOverride } = useConfirmationOverrides();
  const { setOverride: setFlagOverride } = useFlagOverrides();
  const { flaggedByMe: flaggedOverrides, setConfirmedByMe, setFlaggedByMe } = useConfirmFlagExclusivity();
  const { count, confirmed, loading, error, setError, confirm } = useConfirm(initialCount, priceId, {
    initialConfirmed: confirmedByMe,
    onSuccess: (newCount, extra) => {
      setOverride(priceId, newCount);
      if (extra?.flag_count !== undefined) setFlagOverride(priceId, extra.flag_count);
      setConfirmedByMe(priceId, extra?.confirmed ?? true);
      setFlaggedByMe(priceId, extra?.flagged ?? false);
      onConfirmed?.(newCount);
    },
  });

  const isFlaggedByMe = flaggedOverrides[priceId] ?? flaggedByMe;
  const disabled = loading || isFlaggedByMe;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          setTimeout(() => confirm(), 0);
        }}
        disabled={disabled}
        title={isFlaggedByMe ? "لا يمكن التأكيد لأنك أبلغت عن هذا السعر" : undefined}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all",
          confirmed
            ? "bg-olive text-white"
            : "bg-olive-pale border border-olive-mid text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        )}
      >
        {loading ? "جاري..." : confirmed ? `✓ أكّدت ` : "✓ أكّد السعر"}
      </button>
      {error && (
        <ApiErrorBox message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
