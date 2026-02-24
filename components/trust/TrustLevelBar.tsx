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
    <div>
      <div className="flex items-center gap-0 mb-1.5">
        {LEVELS.map((l, i) => (
          <div key={l} className="flex items-center flex-1">
            {/* Dot */}
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 z-10",
                i < currentIdx
                  ? "bg-olive border-olive"
                  : i === currentIdx
                  ? "bg-white border-olive shadow-[0_0_0_3px_#EBF3EE]"
                  : "bg-white border-border"
              )}
            />
            {/* Line between dots */}
            {i < LEVELS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1",
                  i < currentIdx ? "bg-olive" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
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
