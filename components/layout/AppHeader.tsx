"use client";

import { useArea } from "@/hooks/useArea";
import { SearchBar } from "@/components/search/SearchBar";

export function AppHeader() {
  const { area } = useArea();

  return (
    <div className="bg-olive px-5 pt-4 pb-5 relative overflow-hidden flex-shrink-0">
      {/* BG circles */}
      <div className="absolute w-44 h-44 rounded-full bg-white/5 -bottom-14 -left-12 pointer-events-none" />
      <div className="absolute w-24 h-24 rounded-full bg-white/4 -top-8 right-5 pointer-events-none" />

      {/* Top row */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="font-display font-extrabold text-xl text-white leading-none">
          غزة <span className="text-sand">بريس</span>
        </div>
        {area && (
          <div className="flex items-center gap-1.5 bg-white/12 border border-white/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-sand" />
            <span className="text-[11px] text-white/90 font-body">{area.name_ar}</span>
          </div>
        )}
      </div>

      <p className="text-[13px] text-white/60 font-body mb-3 relative z-10">
        أسعار شفافة · قوة المجتمع
      </p>

      <SearchBar />
    </div>
  );
}
