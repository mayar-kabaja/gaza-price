"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "@/hooks/useConfirm";
import { queryKeys } from "@/lib/queries/fetchers";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  priceId: string;
  /** Required so we can invalidate the prices list and refresh confirmation_count on the card. */
  productId: string;
  initialCount: number;
  /** When true, show as already confirmed by current user (e.g. in feed). */
  confirmedByMe?: boolean;
}

export function ConfirmButton({ priceId, productId, initialCount, confirmedByMe = false }: ConfirmButtonProps) {
  const queryClient = useQueryClient();
  const { count, confirmed, loading, error, setError, confirm } = useConfirm(initialCount, priceId, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prices(productId) });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
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
        disabled={isConfirmed || loading}
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
