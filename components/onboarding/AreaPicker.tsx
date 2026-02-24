"use client";

import { useState } from "react";
import { Area } from "@/types/app";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { cn } from "@/lib/utils";

interface AreaPickerProps {
  areas: Area[];
  onSelect: (area: Area) => void;
  loading?: boolean;
}

const GOV_LABELS: Record<string, string> = {
  north:   "شمال غزة",
  central: "وسط القطاع",
  south:   "جنوب غزة",
};

export function AreaPicker({ areas, onSelect, loading }: AreaPickerProps) {
  const [selected, setSelected] = useState<Area | null>(null);

  // Group by governorate
  const grouped = areas.reduce<Record<string, Area[]>>((acc, area) => {
    const g = area.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(area);
    return acc;
  }, {});

  const govOrder = ["north", "central", "south"];

  return (
    <div className="flex flex-col h-dvh bg-white">
      {/* Header */}
      <div className="bg-olive px-5 pt-6 pb-7 relative overflow-hidden flex-shrink-0">
        <div className="absolute w-48 h-48 rounded-full bg-white/5 -bottom-16 -left-14 pointer-events-none" />
        <div className="inline-block bg-white/15 border border-white/20 rounded-[20px] px-2.5 py-0.5 mb-2.5 text-[11px] font-semibold text-white/80">
          الخطوة 1 من 1 · إعداد سريع
        </div>
        <h1 className="font-display font-extrabold text-[1.3rem] text-white leading-tight mb-1">
          أين تسكن؟
        </h1>
        <p className="text-[0.8rem] text-white/65 font-body mt-0.5">
          لنُريك أسعار منطقتك — يمكن تغييرها لاحقاً
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {govOrder.map((gov) => {
          const govAreas = grouped[gov];
          if (!govAreas?.length) return null;
          return (
            <div key={gov} className="mb-4">
              {/* Gov label */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-bold text-mist uppercase tracking-widest">
                  {GOV_LABELS[gov]}
                </span>
              </div>

              {govAreas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelected(area)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right",
                    selected?.id === area.id
                      ? "border-olive bg-olive-pale"
                      : "border-border bg-white hover:border-olive-mid"
                  )}
                >
                  {/* Radio */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      selected?.id === area.id
                        ? "border-olive bg-olive"
                        : "border-border"
                    )}
                  >
                    {selected?.id === area.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div
                      className={cn(
                        "font-display font-bold text-sm",
                        selected?.id === area.id ? "text-olive-deep" : "text-ink"
                      )}
                    >
                      {area.name_ar}
                    </div>
                    <div className="text-xs text-mist mt-0.5">
                      {GOV_LABELS[area.governorate]}
                    </div>
                  </div>

                  {/* Checkmark */}
                  {selected?.id === area.id && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#4A7C59"/>
                      <path d="M7 12l4 4 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-5 pt-3 border-t border-border bg-white flex-shrink-0">
        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected || loading}
          className={cn(
            "w-full py-4 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2",
            selected
              ? "bg-olive text-white shadow-[0_4px_16px_rgba(74,124,89,0.35)] active:scale-[0.99]"
              : "bg-ink/10 text-ink/30 cursor-not-allowed"
          )}
        >
          {loading ? (
            <LoaderDots size="sm" variant="light" />
          ) : (
            <>
              {selected ? `عرض أسعار ${selected.name_ar} ←` : "اختر منطقتك"}
            </>
          )}
        </button>
        <p className="text-center text-xs text-mist mt-2.5">
          مجهول الهوية تماماً · لا حساب · لا هاتف
        </p>
      </div>
    </div>
  );
}
