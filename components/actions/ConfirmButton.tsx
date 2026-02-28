"use client";

import { useConfirm } from "@/hooks/useConfirm";
import { useConfirmationOverrides } from "@/contexts/ConfirmationOverridesContext";
import { toArabicNumerals } from "@/lib/arabic";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  priceId: string;
  productId: string;
  initialCount: number;
  /** When true, show as already confirmed by current user (e.g. in feed). */
  confirmedByMe?: boolean;
  /** Optional extra callback when confirm succeeds (e.g. for local state). */
  onConfirmed?: (newCount: number) => void;
}

export function ConfirmButton({ priceId, productId, initialCount, confirmedByMe = false, onConfirmed }: ConfirmButtonProps) {
  const { setOverride } = useConfirmationOverrides();
  const { count, confirmed, loading, error, setError, confirm } = useConfirm(initialCount, priceId, {
    initialConfirmed: confirmedByMe,
    onSuccess: (newCount) => {
      setOverride(priceId, newCount);
      onConfirmed?.(newCount);
    },
  });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => confirm(), 0);
        }}
        disabled={loading}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all",
          confirmed
            ? "bg-olive text-white"
            : "bg-olive-pale border border-olive-mid text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-70"
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
