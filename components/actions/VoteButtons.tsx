"use client";

import { useVote, type VoteState } from "@/hooks/useVote";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

interface VoteButtonsProps {
  priceId: string;
  initialVote?: VoteState;
  initialConfirmCount?: number;
  initialFlagCount?: number;
  onVoted?: (vote: VoteState, counts: { confirmation_count: number; flag_count: number }) => void;
}

export function VoteButtons({
  priceId,
  initialVote = null,
  initialConfirmCount = 0,
  initialFlagCount = 0,
  onVoted,
}: VoteButtonsProps) {
  const { myVote, loading, error, setError, vote } = useVote(priceId, {
    initialVote,
    initialConfirmCount,
    initialFlagCount,
    onSuccess: onVoted,
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        {/* Confirm button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (loading) return;
            playSound("confirm");
            setTimeout(() => vote("confirm"), 0);
          }}
          disabled={loading}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-semibold font-body transition-all leading-tight",
            myVote === "confirm"
              ? "bg-olive text-white hover:bg-olive/80 active:scale-95"
              : "bg-olive-pale border border-olive-mid text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? "جاري..." : myVote === "confirm" ? "✓ أكّدت" : "✓ تأكيد"}
        </button>

        {/* Flag button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (loading) return;
            playSound("flag");
            setTimeout(() => vote("flag"), 0);
          }}
          disabled={loading}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-semibold font-body transition-all leading-tight",
            myVote === "flag"
              ? "bg-sand/20 text-sand border border-sand/40 hover:bg-sand/30 active:scale-95"
              : "bg-surface border border-border text-mist hover:border-sand hover:bg-sand/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {myVote === "flag" ? "🚩 أبلغت" : "🚩 إبلاغ"}
        </button>
      </div>
      {error && (
        <ApiErrorBox message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
