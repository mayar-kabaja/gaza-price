"use client";

import { Area } from "@/types/app";
import { useAreas } from "@/lib/queries/hooks";
import { cn } from "@/lib/utils";

interface AreaStepProps {
  areaId: string;
  onAreaChange: (id: string) => void;
  onAutoAdvance?: () => void;
}

export function AreaStep({ areaId, onAreaChange, onAutoAdvance }: AreaStepProps) {
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {areas.map((area: Area) => (
        <button
          key={area.id}
          type="button"
          onClick={() => {
            onAreaChange(area.id);
            setTimeout(() => onAutoAdvance?.(), 260);
          }}
          className={cn(
            "px-4 py-2.5 rounded-[30px] border-[1.5px] text-[13px] font-bold transition-all active:scale-95",
            areaId === area.id
              ? "bg-olive text-white border-olive"
              : "bg-surface border-border text-ink/70 hover:border-olive/30 hover:bg-olive-pale/30"
          )}
        >
          {area.name_ar}
        </button>
      ))}
    </div>
  );
}
