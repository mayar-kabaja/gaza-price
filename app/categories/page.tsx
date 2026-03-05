"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSectionsWithCategories, usePublicStats } from "@/lib/queries/hooks";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";
import type { Section } from "@/types/app";

const ENERGY_SECTION_NAMES = ["طاقة ووقود"];
const ENERGY_CATEGORY_NAMES = ["غاز الطهي", "وقود ومحروقات", "بطاريات ومولدات"];

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function CategoriesContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: sections, isLoading, isError } = useSectionsWithCategories();
  const { data: stats } = usePublicStats();

  const totalCategories = useMemo(() => {
    if (stats?.categories != null) return stats.categories;
    if (!Array.isArray(sections)) return 0;
    return sections.reduce((acc, s) => acc + (s.categories?.length ?? 0), 0);
  }, [sections, stats]);

  const filteredSections = useMemo(() => {
    if (!Array.isArray(sections)) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        categories: (s.categories ?? []).filter((c) =>
          (c.name_ar ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter((s) => (s.categories?.length ?? 0) > 0);
  }, [sections, searchQuery]);

  const isWideCard = (section: Section, catName: string) =>
    ENERGY_SECTION_NAMES.includes(section.name_ar) &&
    ENERGY_CATEGORY_NAMES.includes(catName);

  const getCategoryBadge = (section: Section, catName: string) => {
    if (!ENERGY_SECTION_NAMES.includes(section.name_ar)) return null;
    if (["غاز الطهي", "وقود ومحروقات"].includes(catName)) return "حيوي";
    if (catName === "بطاريات ومولدات") return "مهم";
    return null;
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/" className="text-white/60 hover:text-white font-body text-sm">
            ←
          </Link>
          <div className="font-display font-extrabold text-xl text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </div>
        </div>
        <h1 className="font-display font-bold text-lg text-white mt-2">التصنيفات</h1>
        <p className="text-sm text-white/70 mt-0.5 font-body">تصنيفات المنتجات</p>
      </div>

      {/* Stats strip */}
      <div className="flex bg-surface border-b border-border">
        <div className="flex-1 py-3 px-2 text-center border-l border-border">
          <div className="font-display font-bold text-base text-olive-deep">{formatCount(totalCategories)}</div>
          <div className="text-[10px] text-mist mt-0.5">تصنيف</div>
        </div>
        <div className="flex-1 py-3 px-2 text-center border-l border-border">
          <div className="font-display font-bold text-base text-olive-deep">{stats ? formatCount(stats.products) : "—"}</div>
          <div className="text-[10px] text-mist mt-0.5">منتج</div>
        </div>
        <div className="flex-1 py-3 px-2 text-center">
          <div className="font-display font-bold text-base text-olive-deep">{stats ? formatCount(stats.prices) : "—"}</div>
          <div className="text-[10px] text-mist mt-0.5">سعر مُسجّل</div>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-2 bg-fog border border-border rounded-xl px-3.5 py-2.5 focus-within:border-olive-mid transition-colors">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-mist shrink-0" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="ابحث عن تصنيف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-mist font-body text-right"
            dir="rtl"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {isError && (
          <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            تعذر تحميل التصنيفات
          </div>
        )}

        {isLoading && (
          <div className="px-4 py-6 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 bg-fog rounded mb-3" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="h-24 bg-fog rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && filteredSections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-display font-bold text-ink mb-1">لا توجد نتائج</div>
            <div className="text-sm text-mist">جرب كلمة بحث أخرى</div>
          </div>
        )}

        {!isLoading && !isError && filteredSections.length > 0 && (
          <div className="px-4 py-5 space-y-6">
            {filteredSections.map((section) => (
              <div key={section.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <h2 className="font-display font-bold text-[13px] text-slate uppercase tracking-wide whitespace-nowrap">
                    {section.icon ? `${section.icon} ` : ""}{section.name_ar}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(section.categories ?? []).map((cat) => {
                    const wide = isWideCard(section, cat.name_ar);
                    const badge = getCategoryBadge(section, cat.name_ar);
                    return (
                      <Link
                        key={cat.id}
                        href={`/?category=${cat.id}`}
                        className={cn(
                          "block rounded-2xl border-[1.5px] border-border bg-surface transition-all active:scale-[0.96]",
                          "hover:border-olive-mid hover:shadow-md",
                          wide && "col-span-3 flex-row flex items-center gap-3 px-4 py-3.5 text-right"
                        )}
                      >
                        {wide ? (
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-2xl">{cat.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-bold text-sm text-ink">
                                {cat.name_ar === "غاز الطهي" ? "غاز الطهي — أسطوانة" : cat.name_ar === "وقود ومحروقات" ? (
                                  <>
                                    وقود ومحروقات
                                    <span className="block text-xs font-normal text-mist mt-0.5">بنزين · ديزل · كيروسين</span>
                                  </>
                                ) : (
                                  cat.name_ar
                                )}
                              </div>
                            </div>
                            {badge && (
                              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-olive-pale text-olive border border-olive-mid shrink-0">
                                {badge}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 p-4">
                            <span className="text-2xl">{cat.icon}</span>
                            <div className="font-display font-bold text-xs text-ink text-center leading-tight">
                              {cat.name_ar}
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="min-h-dvh bg-fog">
      <CategoriesContent />
    </div>
  );
}
