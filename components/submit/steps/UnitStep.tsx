"use client";

import { PRODUCT_UNITS } from "@/lib/constants";

interface UnitStepProps {
  unit: string;
  onUnitChange: (val: string) => void;
  unitSize: string;
  onUnitSizeChange: (val: string) => void;
}

export function UnitStep({ unit, onUnitChange, unitSize, onUnitSizeChange }: UnitStepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <div className="text-[11px] font-semibold text-mist mb-1.5 pr-0.5">الوحدة</div>
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="w-full border-[1.5px] border-border rounded-xl px-3 h-[44px] text-sm font-body text-ink bg-surface outline-none focus:border-olive"
        >
          {PRODUCT_UNITS.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <div className="text-[11px] font-semibold text-mist mb-1.5 pr-0.5">الكمية</div>
        <input
          type="text"
          inputMode="decimal"
          dir="ltr"
          lang="en"
          value={unitSize}
          onChange={(e) => onUnitSizeChange(e.target.value)}
          placeholder="250"
          className="w-full border-[1.5px] border-border rounded-xl px-3 h-[44px] text-sm font-body text-ink bg-surface outline-none focus:border-olive text-left"
        />
      </div>
    </div>
  );
}
