"use client";

import { getStoredToken } from "@/lib/auth/token";
import { useConfirm } from "@/hooks/useConfirm";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  priceId: string;
  initialCount: number;
  /** When true, show as already confirmed by current user (e.g. in feed). */
  confirmedByMe?: boolean;
}

export function ConfirmButton({ priceId, initialCount, confirmedByMe = false }: ConfirmButtonProps) {
  const hasToken = typeof window !== "undefined" ? !!getStoredToken() : false;
  const { count, confirmed, loading, error, setError, confirm } = useConfirm(initialCount, priceId);
  const isConfirmed = confirmedByMe || confirmed;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => confirm(), 0);
        }}
        disabled={isConfirmed || loading || !hasToken}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all",
          isConfirmed
            ? "bg-olive text-white"
            : "bg-olive-pale border border-olive-mid text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-70"
        )}
      >
        {loading ? "جاري..." : isConfirmed ? (confirmedByMe ? "✓ أكّدت" : `✓ ${count}`) : "✓ أكّد السعر"}
      </button>
      {error && (
        <ApiErrorBox message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
