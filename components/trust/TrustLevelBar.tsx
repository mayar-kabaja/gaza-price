import { TrustLevel } from "@/types/app";
import { TRUST_LEVEL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LEVELS: TrustLevel[] = ["new", "regular", "trusted", "verified"];

interface TrustLevelBarProps {
  level: TrustLevel;
}

export function TrustLevelBar({ level }: TrustLevelBarProps) {
  const currentIdx = LEVELS.indexOf(level);

  return (
    <div dir="rtl">
      {/* Track: new (right) → verified (left). Green fills from right (start) to current. */}
      <div className="relative flex items-center mb-1.5">
        {/* Background line (full width) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-border rounded-full" aria-hidden />
        {/* Filled portion: from right (new) to current level */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 h-1 bg-olive rounded-full transition-all"
          style={{ width: `${(currentIdx / (LEVELS.length - 1)) * 100}%` }}
          aria-hidden
        />
        {/* Dots */}
        <div className="relative flex w-full justify-between">
          {LEVELS.map((l, i) => (
            <div
              key={l}
              className={cn(
                "w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 z-10",
                i < currentIdx
                  ? "bg-olive border-olive"
                  : i === currentIdx
                  ? "bg-white border-olive shadow-[0_0_0_3px_#EBF3EE]"
                  : "bg-white border-border"
              )}
            />
          ))}
        </div>
      </div>

      {/* Labels — same LTR order so they align with dots */}
      <div className="flex justify-between">
        {LEVELS.map((l, i) => (
          <span
            key={l}
            className={cn(
              "text-[10px] text-center",
              i === currentIdx
                ? "text-olive font-bold"
                : "text-mist"
            )}
          >
            {TRUST_LEVEL_LABELS[l]}
          </span>
        ))}
      </div>
    </div>
  );
}
