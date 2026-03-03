"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";

type AdminDateRangePickerProps = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
};

function toDate(s: string): Date | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s + "T12:00:00Z");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminDateRangePicker({
  from,
  to,
  onChange,
  placeholder = "From – To",
}: AdminDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fromDate = toDate(from);
  const toDateVal = toDate(to);
  const selected: DateRange | undefined =
    fromDate || toDateVal
      ? {
          from: fromDate ?? toDateVal,
          to: toDateVal ?? fromDate,
        }
      : undefined;

  const displayText =
    from && to
      ? `${from} – ${to}`
      : from
        ? from
        : to
          ? to
          : placeholder;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) {
      onChange("", "");
      return;
    }
    const fromStr = toYYYYMMDD(range.from);
    const toStr = range.to ? toYYYYMMDD(range.to) : fromStr;
    onChange(fromStr, toStr);
    if (range.from && range.to) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex-1 min-w-0 min-h-[36px] w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-left text-xs sm:text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59]/40 transition-colors hover:border-[#2E3D50]"
      >
        <span className={!from && !to ? "text-[#4E6070]" : ""}>
          {displayText}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-[10px] border border-[#243040] bg-[#111820] p-3 shadow-xl">
          <div className="rdp-root-admin">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={fromDate ?? toDateVal ?? new Date()}
              numberOfMonths={1}
              showOutsideDays
              className="!bg-transparent !border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
