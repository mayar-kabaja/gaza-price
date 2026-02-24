"use client";

import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  priceId: string;
  initialCount: number;
}

export function ConfirmButton({ priceId, initialCount }: ConfirmButtonProps) {
  const { count, confirmed, loading, confirm } = useConfirm(initialCount, priceId);

  return (
    <button
      onClick={confirm}
      disabled={confirmed || loading}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all",
        confirmed
          ? "bg-olive text-white"
          : "bg-olive-pale border border-olive-mid text-olive hover:bg-olive-mid active:scale-95"
      )}
    >
      {confirmed ? `✓ ${count}` : "✓ أكّد السعر"}
    </button>
  );
}
