"use client";

import { useState } from "react";
import type { Area, Governorate } from "@/types/app";
import { cn } from "@/lib/utils";
import { useAreas, useSectionsWithCategories } from "@/lib/queries/hooks";

const GOV_LABELS: Record<Governorate, string> = {
  north: "شمال غزة",
  central: "وسط القطاع",
  south: "جنوب غزة",
};

const GOV_ORDER: Governorate[] = ["north", "central", "south"];

interface DesktopSidebarProps {
  selectedAreaId: string | null;
  selectedCategoryId: string | null;
  onAreaSelect: (area: Area) => void;
  onCategorySelect: (categoryId: string) => void;
  onSubmitClick?: () => void;
}

export function DesktopSidebar({
  selectedAreaId,
  selectedCategoryId,
  onAreaSelect,
  onCategorySelect,
  onSubmitClick,
}: DesktopSidebarProps) {
  const { data: areasData, isLoading: areasLoading } = useAreas();
  const { data: sections = [], isLoading: sectionsLoading } = useSectionsWithCategories();
  const areas = (areasData as { areas?: Area[] })?.areas ?? [];
  // Collapsible state for governorates and nav sections
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>(() => {
    // Open the first governorate by default
    const init: Record<string, boolean> = {};
    if (GOV_ORDER.length > 0) init[GOV_ORDER[0]] = true;
    return init;
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (sections.length > 0) init[sections[0].id] = true;
    return init;
  });

  function toggleGov(gov: string) {
    setOpenGovs((prev) => ({ ...prev, [gov]: !prev[gov] }));
  }

  function toggleSection(sectionId: string) {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  // Group areas by governorate
  const areasByGov = GOV_ORDER.map((gov) => ({
    gov,
    label: GOV_LABELS[gov],
    areas: areas.filter((a) => a.governorate === gov),
  })).filter((g) => g.areas.length > 0);

  return (
    <aside className="w-[280px] flex-shrink-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Area filter — grouped by governorate */}
        <div className="p-5 border-b border-border">
          <h3 className="text-xs font-display font-bold text-mist uppercase tracking-wide mb-3">المنطقة</h3>
          {areasLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-fog animate-pulse" />
              ))}
            </div>
          ) : (
          <div className="space-y-1">
            {areasByGov.map((group) => {
              const isOpen = openGovs[group.gov] ?? false;
              const govReportCount = group.areas.reduce((sum, a) => sum + (a.active_reports_count ?? 0), 0);
              return (
                <div key={group.gov}>
                  <button
                    type="button"
                    onClick={() => toggleGov(group.gov)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-display font-bold text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                  >
                    <span>{group.label}</span>
                    <span className="flex items-center gap-2">
                      {govReportCount > 0 && (
                        <span className="text-[11px] text-mist font-body font-normal">{govReportCount}</span>
                      )}
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={cn("text-mist transition-transform", isOpen && "rotate-90")}
                      >
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mr-4 mt-0.5 space-y-0.5">
                      {group.areas.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onAreaSelect(a)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-body transition-colors text-right cursor-pointer",
                            selectedAreaId === a.id
                              ? "bg-olive-pale text-olive font-semibold border border-olive-mid"
                              : "text-slate hover:bg-fog hover:text-ink"
                          )}
                        >
                          <span>{a.name_ar}</span>
                          {a.active_reports_count != null && (
                            <span className="text-[11px] text-mist bg-fog rounded-full px-2 py-0.5">
                              {a.active_reports_count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Nav tree */}
        <div className="p-5">
          <h3 className="text-xs font-display font-bold text-mist uppercase tracking-wide mb-3">الأقسام والتصنيفات</h3>
          {sectionsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-fog animate-pulse" />
              ))}
            </div>
          ) : (
          <div className="space-y-1">
            {sections.map((section) => {
              const isOpen = openSections[section.id] ?? false;
              const categories = section.categories ?? [];
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-display font-bold text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {section.icon && <span>{section.icon}</span>}
                      {section.name_ar}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] text-mist font-body font-normal">{categories.length}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={cn("text-mist transition-transform", isOpen && "rotate-90")}
                      >
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && categories.length > 0 && (
                    <div className="mr-4 mt-0.5 space-y-0.5">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => onCategorySelect(cat.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-body transition-colors text-right cursor-pointer",
                            selectedCategoryId === cat.id
                              ? "bg-olive-pale text-olive font-semibold"
                              : "text-slate hover:bg-fog hover:text-ink"
                          )}
                        >
                          {cat.icon && <span className="text-sm">{cat.icon}</span>}
                          <span className="flex-1">{cat.name_ar}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-border">
        <button
          type="button"
          onClick={onSubmitClick}
          className="block w-full rounded-xl bg-gradient-to-l from-olive to-olive-deep p-4 text-center text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="font-display font-bold text-sm mb-1">ساعد مجتمعك</div>
          <div className="text-[11px] text-white/70">أبلغ عن سعر وساهم في الشفافية</div>
        </button>
      </div>
    </aside>
  );
}
