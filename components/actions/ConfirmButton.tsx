"use client";

import { useConfirm } from "@/hooks/useConfirm";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

interface ConfirmButtonProps {
  priceId: string;
  productId: string;
  initialCount: number;
  confirmedByMe?: boolean;
  flaggedByMe?: boolean;
  onConfirmed?: (newCount: number) => void;
}

export function ConfirmButton({ priceId, productId, initialCount, confirmedByMe = false, flaggedByMe = false, onConfirmed }: ConfirmButtonProps) {
  const { count, confirmed, loading, error, setError, confirm } = useConfirm(initialCount, priceId, {
    initialConfirmed: confirmedByMe,
    onSuccess: (newCount) => {
      onConfirmed?.(newCount);
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
          playSound("confirm");
          setTimeout(() => confirm(), 0);
        }}
        disabled={disabled}
        className={cn(
          "px-2.5 py-1 rounded-md text-[11px] font-semibold font-body transition-all leading-tight",
          confirmed
            ? "bg-olive text-white hover:bg-olive/80 active:scale-95"
            : "bg-olive-pale border border-olive-mid text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? "جاري..." : confirmed ? "✓ أكّدت" : "✓ تأكيد"}
      </button>
      {error && (
        <ApiErrorBox message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
