"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SliderRowProps {
  children: React.ReactNode;
}

export function SliderRow({ children }: SliderRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // RTL: scrollLeft is 0 at the right edge (start) and negative as you scroll left
    const sl = Math.abs(el.scrollLeft);
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(sl > 1);
    setCanNext(sl < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [check]);

  // RTL: "next" means scroll left (negative), "prev" means scroll right (positive)
  function scrollDir(dir: "prev" | "next") {
    const el = ref.current;
    if (!el) return;
    const amount = dir === "next" ? -240 : 240;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative group">
      <div ref={ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-2" dir="rtl">
        {children}
      </div>

      {/* Right arrow (next - scroll left in RTL) */}
      {canNext && (
        <button
          onClick={() => scrollDir("next")}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface border border-border shadow-md flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-fog"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      )}

      {/* Left arrow (prev - scroll right in RTL) */}
      {canPrev && (
        <button
          onClick={() => scrollDir("prev")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface border border-border shadow-md flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-fog"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}
    </div>
  );
}
