"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTickerAds } from "@/lib/queries/hooks";
import { usePlaces } from "@/lib/queries/hooks";
import type { TickerAd } from "@/lib/queries/fetchers";

const EMOJI_MAP: Record<string, string> = {
  restaurant: "🍽️", cafe: "☕", bakery: "🫓", juice: "🧃",
  "بقالية عامة": "🛒", "سوبرماركت": "🛒", "خضار وفواكه": "🥬", "لحوم": "🥩",
  "سمك": "🐟", "مخبز": "🫓", "حلويات ومعجنات": "🍰", "بهارات وتوابل": "🌶️",
  "صيدلية": "💊", "عيادة وطب": "🏥", "مستلزمات طبية": "🩺", "بصريات": "👓",
  "ملابس رجالي": "👔", "ملابس حريمي": "👗", "ملابس أطفال": "🧒", "أحذية": "👟",
  "إكسسوارات": "💍", "خياطة وتعديل": "🧵",
  "أثاث منزلي": "🛋️", "مفروشات وستائر": "🪟", "أدوات منزلية": "🏠",
  "كهرباء ولوازم منزلية": "💡", "نظافة ومنظفات": "🧹",
  "موبايل وإكسسوارات": "📱", "كمبيوتر ولاب توب": "💻", "كهربائيات": "🔌",
  "طاقة شمسية": "☀️", "إصلاح وصيانة": "🔧",
  "مواد بناء": "🏗️", "مكتبة وقرطاسية": "📚", "ألعاب أطفال": "🧸",
  "حلاقة وصالون": "💈", "عطور وكوزمتيك": "🌸",
  "قطع غيار سيارات": "🚗",
};

function getEmoji(type: string): string {
  return EMOJI_MAP[type] ?? "🏪";
}

/** Pick N items from array based on day-of-year so it rotates daily */
function dailyPick<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const start = (dayOfYear * count) % items.length;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(items[(start + i) % items.length]);
  }
  return picked;
}

const ADS_PER_DAY = 5;

export function TickerStrip() {
  const { data: tickerAds } = useTickerAds();
  const { data: foodData } = usePlaces("food", undefined, 50, 0);
  const { data: storeData } = usePlaces("store", undefined, 50, 0);
  const { data: workspaceData } = usePlaces("workspace", undefined, 50, 0);

  // Build daily rotation from real places when no paid ticker ads exist
  const items: TickerAd[] = useMemo(() => {
    // Paid ticker ads take priority
    if (tickerAds && tickerAds.length > 0) return tickerAds;

    // Fall back to real places from DB — interleave all sections
    const food = (foodData?.places ?? []);
    const store = (storeData?.places ?? []);
    const workspace = (workspaceData?.places ?? []);
    const sections = [food, store, workspace].filter((s) => s.length > 0);
    if (sections.length === 0) return [];

    // Interleave: pick one from each section in round-robin
    const interleaved: typeof food = [];
    const maxLen = Math.max(...sections.map((s) => s.length));
    for (let i = 0; i < maxLen; i++) {
      for (const sec of sections) {
        if (i < sec.length) interleaved.push(sec[i]);
      }
    }

    const mapped: TickerAd[] = interleaved.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      area_name_ar: p.area?.name_ar ?? "",
    }));

    return dailyPick(mapped, ADS_PER_DAY);
  }, [tickerAds, foodData, storeData, workspaceData]);

  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const advance = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
      setAnimating(false);
    }, 300);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(advance, 2500);
    return () => clearInterval(t);
  }, [items.length, advance]);

  if (items.length === 0) return null;

  const current = items[index];

  const content = (
    <div className="ticker-strip h-[34px] w-full flex items-center justify-center overflow-hidden relative z-20 border-b" style={{ background: "#0F172A", borderColor: "#334155" }}>
      <div className="flex items-center gap-2 px-4 max-w-full">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide flex-shrink-0" style={{ background: "#FACC15", color: "#0F172A" }}>
          إعلان
        </span>
        <div className="overflow-hidden h-[20px] flex-1 min-w-0">
          <div
            className="transition-transform duration-300 ease-in-out"
            style={{ transform: animating ? "translateY(-100%)" : "translateY(0)" }}
          >
            <div className="h-[20px] flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] flex-shrink-0">{getEmoji(current.type)}</span>
              <span className="text-[12px] font-bold truncate" style={{ color: "#F8FAFC" }}>{current.name}</span>
              <span className="text-[10px] flex-shrink-0" style={{ color: "#94A3B8" }}>—</span>
              <span className="text-[10px] truncate" style={{ color: "#94A3B8" }}>{current.type} · {current.area_name_ar}</span>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0" style={{ stroke: "#94A3B8" }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );

  return (
    <Link href={`/places/${current.id}`}>
      {content}
    </Link>
  );
}
