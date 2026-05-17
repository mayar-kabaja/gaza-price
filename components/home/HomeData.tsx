"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { HomeProductCardSkeleton } from "@/components/ui/Skeleton";
import { useArea } from "@/hooks/useArea";
import type { Category, ReportFeedItem } from "@/types/app";
import type { Place } from "@/lib/api/places";
import { useBootstrap, useProductsInfinite, useReportsInfinite, usePlaces, usePublicStats } from "@/lib/queries/hooks";
import { ReportCard } from "@/components/reports/ReportCard";
import { VoteButtons } from "@/components/actions/VoteButtons";
import { useVote } from "@/hooks/useVote";
import { formatRelativeTime, toArabicNumerals } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import { TrustDots } from "@/components/trust/TrustDots";
import { isStale } from "@/lib/price";
import { normalizeDigits } from "@/lib/normalize-digits";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useGlobalSidebar, useGlobalHero, useGlobalContext } from "@/components/layout/GlobalDesktopShell";
import { CategoryIcon } from "@/lib/category-icons";

const DesktopSidebar = dynamic(() => import("@/components/desktop/DesktopSidebar"), { ssr: false });

const ALL_CATEGORY_ID = "__all__";

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** SVG icon lookup by category + product keywords */
type CatIcon = { path: React.ReactNode; color: string; bg: string };

const ICON_FOOD: CatIcon = {
  path: <><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  color: "#D97706", bg: "#FFF7ED",
};
const ICON_VEGS: CatIcon = {
  path: <><path d="M7 21h10"/><path d="M12 21a9 9 0 009-9H3a9 9 0 009 9z"/><path d="M12 3v7"/><path d="M9.17 5a4 4 0 015.66 0"/></>,
  color: "#16A34A", bg: "#F0FDF4",
};
const ICON_MEAT: CatIcon = {
  path: <><circle cx="12" cy="12" r="10"/><path d="M8 12s1.5-2 4-2 4 2 4 2"/><path d="M9 8h0"/><path d="M15 8h0"/></>,
  color: "#DC2626", bg: "#FEF2F2",
};
const ICON_DRINK: CatIcon = {
  path: <><path d="M17 8h1a4 4 0 110 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><path d="M6 2v2"/><path d="M10 2v2"/></>,
  color: "#0891B2", bg: "#ECFEFF",
};
const ICON_HOME: CatIcon = {
  path: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  color: "#7C3AED", bg: "#F5F3FF",
};
const ICON_ENERGY: CatIcon = {
  path: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  color: "#EA580C", bg: "#FFF7ED",
};
const ICON_CLOTHES: CatIcon = {
  path: <><path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></>,
  color: "#EC4899", bg: "#FDF2F8",
};
const ICON_TECH: CatIcon = {
  path: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  color: "#3B82F6", bg: "#EFF6FF",
};
const ICON_TOOLS: CatIcon = {
  path: <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
  color: "#6B7280", bg: "#F3F4F6",
};
const ICON_GRAIN: CatIcon = {
  path: <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
  color: "#92400E", bg: "#FFFBEB",
};
const ICON_BABY: CatIcon = {
  path: <><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/></>,
  color: "#F472B6", bg: "#FCE7F3",
};
const ICON_CLEAN: CatIcon = {
  path: <><path d="M12 2v6"/><path d="M9 8h6l1 13H8L9 8z"/><path d="M8 21h8"/></>,
  color: "#06B6D4", bg: "#ECFEFF",
};

const DEFAULT_ICON: CatIcon = {
  path: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  color: "#4A7C59", bg: "#F0F5EB",
};

/** Keywords → icon. Checked against category name AND product name */
const KEYWORD_ICON_MAP: [string[], CatIcon][] = [
  [["خضار", "طماطم", "بصل", "ثوم", "خيار", "بطاطا", "جزر", "فلفل", "باذنجان", "كوسا", "بقدونس", "نعنع", "ملوخية", "بامية"], ICON_VEGS],
  [["لحم", "دجاج", "فروج", "لحوم", "كبد", "سمك", "تونة", "سردين"], ICON_MEAT],
  [["مشروب", "عصير", "ماء", "كولا", "بيبسي", "شاي", "قهوة", "حليب", "لبن", "نسكافيه"], ICON_DRINK],
  [["الغذاء", "طحين", "أرز", "رز", "سكر", "ملح", "زيت", "معكرونة", "معلب", "حمص", "فول", "عدس", "برغل", "شعيرية", "خبز"], ICON_GRAIN],
  [["طاقة", "وقود", "بنزين", "سولار", "غاز", "كهرباء", "شمسي"], ICON_ENERGY],
  [["منزلية", "صابون", "مسحوق", "منظف", "شامبو", "معجون", "فوط", "مناديل"], ICON_CLEAN],
  [["ملابس", "قماش", "حذاء", "جاكيت", "بنطلون"], ICON_CLOTHES],
  [["إلكتروني", "شاحن", "موبايل", "جوال", "بطارية", "كابل", "سماعة"], ICON_TECH],
  [["أدوات", "مفك", "مطرقة", "مسمار"], ICON_TOOLS],
  [["أطفال", "حفاض", "رضاعة", "حليب أطفال"], ICON_BABY],
  [["غذاء", "طعام", "أكل", "وجبة", "فلافل", "شاورما"], ICON_FOOD],
  [["بيض", "جبن", "زبدة", "لبنة"], ICON_FOOD],
];

function getCategoryIcon(categoryName?: string, productName?: string): CatIcon {
  const text = `${categoryName ?? ""} ${productName ?? ""}`;
  for (const [keywords, icon] of KEYWORD_ICON_MAP) {
    if (keywords.some(k => text.includes(k))) return icon;
  }
  return DEFAULT_ICON;
}

const CURRENCY_STYLES: Record<string, { symbol: string; bg: string; text: string }> = {
  USD: { symbol: "$", bg: "#EFF6FF", text: "#2563EB" },
  JOD: { symbol: "JD", bg: "#FEF3C7", text: "#B45309" },
  EUR: { symbol: "\u20AC", bg: "#F0FDF4", text: "#16a34a" },
};

function ExchangeRatesBanner() {
  const [rates, setRates] = useState<{ currency: string; code: string; rate: number; change: number; direction: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exchange")
      .then((r) => r.json())
      .then((data) => { setRates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex items-center gap-6 flex-wrap pt-5 mt-5 border-t border-dashed border-white/12 text-[12px]">
      <span className="text-white/50 font-medium flex items-center gap-1.5 flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sand"><circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
        أسعار الصرف اليوم
      </span>
      {loading ? (
        <div className="flex items-center gap-4 flex-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-3 w-20 bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <span className="text-white/50">—</span>
      ) : (
        <>
          {rates.map((r, i) => (
            <span key={r.code} className="flex items-baseline gap-1">
              {i > 0 && <span className="w-px h-3.5 bg-white/12 -mr-2 ml-1 inline-block" />}
              <span className="text-white/55 font-medium text-[11px]">{r.code}</span>
              <span className="font-bold text-[14px] text-white tracking-tight">{r.rate}</span>
              <span className="text-white/50 text-[11px]">₪</span>
            </span>
          ))}
        </>
      )}
    </div>
  );
}

/** Borderless list-row price card for desktop — hairline separated */
function DesktopReportCard({ report, isLast }: { report: ReportFeedItem; isLast?: boolean }) {
  const { myVote, confirmCount, flagCount, loading, error, setError, vote } = useVote(report.id, {
    initialVote: report.my_vote,
    initialConfirmCount: report.confirmation_count,
    initialFlagCount: report.flag_count,
  });

  const product = report.product;
  const productLabel = product
    ? `${product.name_ar} ${toArabicNumerals(product.unit_size)} ${product.unit}`
    : "—";
  const storeName = report.store?.name_ar ?? report.store_name_raw ?? "";
  const areaName = report.area?.name_ar ?? "";
  const isDemo = !!report.is_demo;
  const stale = isStale(report.reported_at);
  const highlyConfirmed = confirmCount >= 5;
  const disputed = flagCount >= 2;
  const store_address = report.store_address;
  const store_phone = report.store_phone ? normalizeDigits(report.store_phone) : report.store_phone;
  const hasDetails = !!(store_address || store_phone);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className={`flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-olive-pale/40 active:bg-olive-pale relative`}>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Link href={`/product/${report.product_id}`} className="font-display font-normal text-[13px] text-ink truncate hover:text-olive transition-colors">
            {productLabel}
          </Link>
          {storeName && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-fog text-mist border border-border flex-shrink-0">
              {storeName}
            </span>
          )}
          {highlyConfirmed && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#E1F5EE", color: "#0F6E56" }}>موثوق</span>
          )}
          {disputed && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-sand-light text-[#854F0B] flex-shrink-0">متنازع</span>
          )}
          {isDemo && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 demo-badge text-white rounded-full flex-shrink-0">تجريبي</span>
          )}
        </div>
        <div className="text-[10px] text-mist mb-0.5 flex items-center gap-1">
          {areaName && (
            <>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {areaName}
              <span className="opacity-40 mx-0.5">&middot;</span>
            </>
          )}
          <span>{formatRelativeTime(report.reported_at)}</span>
          <span className="opacity-40 mx-0.5">&middot;</span>
          <span>
            {toArabicNumerals(confirmCount)} {confirmCount === 1 ? "تأكيد" : "تأكيدات"}
          </span>
          {flagCount > 0 && (
            <>
              <span className="opacity-40 mx-0.5">&middot;</span>
              <span>{toArabicNumerals(flagCount)} إبلاغ</span>
            </>
          )}
        </div>
        {hasDetails && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDetailsOpen(!detailsOpen); }}
              className="text-[10px] text-olive hover:underline"
            >
              {detailsOpen ? "إخفاء العنوان والهاتف" : "عرض العنوان والهاتف"}
            </button>
            {detailsOpen && (
              <div className="text-[10px] mt-0.5">
                <div className="text-mist truncate">
                  {areaName}{store_address ? ` - ${store_address}` : ""}
                </div>
                {store_phone && (
                  <a href={`tel:${store_phone}`} className="text-olive hover:underline block text-right" dir="ltr" onClick={(e) => e.stopPropagation()}>
                    {store_phone}
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right — price + actions */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="text-left">
            <span className="text-[16px] font-bold text-olive">{toArabicNumerals(Number(report.price.toFixed(2)))}</span>
            <span className="text-[11px] text-mist mr-0.5">₪ / {product?.unit ?? "كغ"}</span>
          </div>
          {report.is_mine ? (
            <span className="px-2 py-1 rounded-full text-[9px] font-semibold bg-olive/15 text-olive border border-olive/30">سعرك</span>
          ) : (
            <>
              <button
                type="button"
                title={myVote === "confirm" ? "أكّدت السعر" : "تأكيد السعر"}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!loading) vote("confirm"); }}
                disabled={loading}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  myVote === "confirm"
                    ? "bg-olive text-white"
                    : "bg-olive-pale text-olive hover:bg-olive-mid active:scale-95 disabled:opacity-50"
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button
                type="button"
                title={myVote === "flag" ? "أبلغت عن السعر" : "إبلاغ عن السعر"}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!loading) vote("flag"); }}
                disabled={loading}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  myVote === "flag"
                    ? "bg-[#6B7280] text-white"
                    : "bg-fog text-[#6B7280] hover:bg-[#e5e7eb] active:scale-95 disabled:opacity-50"
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function HomeData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams?.get("category") ?? null;
  const areaFromUrl = searchParams?.get("area") ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryFromUrl ?? ALL_CATEGORY_ID);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [desktopPage, setDesktopPage] = useState(0);
  const { area } = useArea();
  const connection = useConnectionQuality();
  const isSlow = connection === "slow";
  const isDesktop = useIsDesktop();
  const { openSubmitModal } = useGlobalContext();
  const { data: globalStats } = usePublicStats();
  const clockTime = useClock();

  // Desktop: sidebar area is browse-only (doesn't save to profile)
  const [browseAreaId, setBrowseAreaId] = useState<string | null>(areaFromUrl);
  const [desktopAreaFilter, setDesktopAreaFilter] = useState<"all" | "myArea">("all");
  const [mobileAreaFilter, setMobileAreaFilter] = useState<"all" | "myArea">("all");
  const activeAreaId = isDesktop
    ? (desktopAreaFilter === "all" ? null : (browseAreaId ?? area?.id ?? null))
    : (mobileAreaFilter === "all" ? null : (area?.id ?? null));

  // Sync from URL when navigating from /categories or /account
  useEffect(() => {
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    if (areaFromUrl) setBrowseAreaId(areaFromUrl);
  }, [areaFromUrl]);

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setDesktopPage(0);
    router.replace(`/?category=${id}`);
  }

  const { data: bootstrap, isLoading: categoriesLoading } = useBootstrap();
  const sections = bootstrap?.sections;

  // Flatten categories from sections (same order as /categories page)
  const sortedCategories = (sections ?? []).flatMap((s) => s.categories ?? []);
  const isAllTab = (categoryFromUrl ?? selectedCategoryId) === ALL_CATEGORY_ID || (!categoryFromUrl && !selectedCategoryId);
  const effectiveCategoryId =
    categoryFromUrl ?? selectedCategoryId ?? ALL_CATEGORY_ID;

  useGlobalSidebar(
    isDesktop ? (
      <DesktopSidebar
        selectedAreaId={activeAreaId}
        selectedCategoryId={effectiveCategoryId}
        onAreaSelect={(a) => setBrowseAreaId(a.id)}
        onCategorySelect={selectCategory}
      />
    ) : null
  );

  useGlobalHero(
    isDesktop ? (
      <div
        className="px-7 py-8 mx-5 mt-4 rounded-2xl relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #3A6347 0%, #2C4F3A 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 800px 300px at 80% -10%, rgba(122, 192, 49, 0.15), transparent)",
        }} />
        <div className="relative max-w-[1440px] mx-auto">
          <div className="flex items-center gap-7 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <h1 className="text-[26px] font-display font-bold text-white m-0 tracking-tight flex items-center gap-2.5">
                <span>أهلاً، تابع أسعار اليوم</span>
                <span className="inline-block" style={{ animation: "wave 2.4s ease-in-out infinite", transformOrigin: "70% 70%" }}>👋</span>
              </h1>
              <div className="text-[13px] text-white/65 mt-1.5 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {area?.name_ar ?? "كل المناطق"} · {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
                <span className="inline-flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {clockTime}
                </span>
              </div>
            </div>
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-1 flex-shrink-0">
              <div className="px-[18px] py-2 text-center">
                <div className="text-[22px] font-display font-bold text-white leading-none tracking-tight">{globalStats?.products ? toArabicNumerals(globalStats.products) : "—"}</div>
                <div className="text-[10px] text-white/55 font-medium mt-1.5 tracking-wide">منتج</div>
              </div>
              <div className="w-px self-stretch my-3.5 bg-white/10" />
              <div className="px-[18px] py-2 text-center">
                <div className="text-[22px] font-display font-bold text-white leading-none tracking-tight">{globalStats?.categories ? toArabicNumerals(globalStats.categories) : "—"}</div>
                <div className="text-[10px] text-white/55 font-medium mt-1.5 tracking-wide">تصنيف</div>
              </div>
              <div className="w-px self-stretch my-3.5 bg-white/10" />
              <div className="px-[18px] py-2 text-center">
                <div className="text-[22px] font-display font-bold text-white leading-none tracking-tight">{globalStats?.prices ? toArabicNumerals(globalStats.prices) : "—"}</div>
                <div className="text-[10px] text-white/55 font-medium mt-1.5 tracking-wide">سعر</div>
              </div>
            </div>
            <button
              onClick={openSubmitModal}
              className="px-5 py-3 bg-white text-olive-deep rounded-xl text-[14px] font-display font-bold hover:-translate-y-0.5 hover:shadow-lg transition-all flex-shrink-0 flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sand"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              أبلغ عن سعر
            </button>
          </div>
          <ExchangeRatesBanner />
        </div>
      </div>
    ) : null
  );

  const {
    data: infiniteData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductsInfinite(isAllTab ? null : effectiveCategoryId, undefined, !isDesktop, activeAreaId, isSlow ? 5 : undefined);

  // "الكل" tab: fetch newest prices from ALL areas
  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
    fetchNextPage: fetchNextReports,
    hasNextPage: hasNextReports,
    isFetchingNextPage: isFetchingNextReports,
  } = useReportsInfinite(
    "all",
    activeAreaId,
    true, // demo_last — real prices first, demo after
    isAllTab, // enabled only when الكل tab is active
    true, // active_only — hide pending/unapproved products
  );
  const allReports = reportsData?.pages?.flatMap((p) => p.reports) ?? [];

  // Desktop dashboard: nearby places — mix of all types from user's area
  const userAreaId = area?.id ?? null;
  const { data: foodData, isLoading: foodLoading } = usePlaces("food", userAreaId, 5);
  const { data: storeData, isLoading: storeLoading } = usePlaces("store", userAreaId, 2);
  const { data: wsData, isLoading: wsLoading } = usePlaces("workspace", userAreaId, 2);
  const placesLoading = foodLoading || storeLoading || wsLoading;
  const homePlaces: Place[] = [
    ...((foodData as any)?.places ?? []),
    ...((storeData as any)?.places ?? []),
    ...((wsData as any)?.places ?? []),
  ];

  const rawProducts = infiniteData?.pages?.flatMap((p) => p.products) ?? [];
  // When user has area selected, only show products that have prices in that area
  const filteredProducts = activeAreaId
    ? rawProducts.filter((p) => Array.isArray(p.price_preview) && p.price_preview.length > 0)
    : rawProducts;
  const products = [...filteredProducts].sort((a, b) => {
    const aHasPrices = Array.isArray(a.price_preview) && a.price_preview.length > 0;
    const bHasPrices = Array.isArray(b.price_preview) && b.price_preview.length > 0;
    if (aHasPrices === bHasPrices) return 0;
    return aHasPrices ? -1 : 1;
  });


  useEffect(() => {
    const t = setTimeout(() => setShowDemoBanner(false), 10000);
    return () => clearTimeout(t);
  }, []);

  const scrollToSelected = useCallback((el: HTMLButtonElement | null) => {
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  const hasCategories = sortedCategories.length > 0;
  const showSkeletons = categoriesLoading || (isAllTab ? reportsLoading : (!!effectiveCategoryId && productsLoading));
  const error = (isAllTab ? reportsError : productsError) ? "تعذر تحميل البيانات" : null;

  return (
    <div
  className={`flex flex-col min-h-dvh ${
    isDesktop ? "pt-4 px-5" : ""
  }`}
>
      {isDesktop ? null : <AppHeader />}

      {/* Welcome + Warning banner — mobile only */}
      {!isDesktop && showDemoBanner && (
        <div className="mx-4 my-2 rounded-xl overflow-hidden animate-slide-down border border-border flex-shrink-0 relative">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowDemoBanner(false)}
            className="absolute top-2 left-2 text-mist/50 text-base p-0.5 shrink-0 z-10"
            aria-label="إغلاق"
          >
            ×
          </button>
          {/* Welcome section */}
          <div className="bg-olive-pale px-3.5 py-2.5 flex items-center gap-2">
            <span className="text-base">👋</span>
            <span className="font-display font-bold text-[12px] text-olive">اهلاً بك في غزة بريس!</span>
          </div>
          {/* Warning section */}
          <div className="bg-sand-light px-3.5 py-2.5 flex items-start gap-2">
            <span className="text-sm mt-0.5 flex-shrink-0">&#9888;&#65039;</span>
            <div className="text-[11px] text-ink/70 leading-relaxed">
              <span className="font-bold text-ink">تنبيه:</span> الأسعار التجريبية مكتوب عليها &quot;تجريبي&quot; وباقي الأسعار حقيقية. إضافة أسعار مزيفة ستؤدي لحظر رقمك نهائياً.
            </div>
          </div>
          <div className="h-[2px] w-full bg-sand/20">
            <div className="h-full bg-sand/50" style={{ animation: "toastProgress 10s linear forwards" }} />
          </div>
        </div>
      )}

      {/* ═══ Desktop rich dashboard ═══ */}
      {isDesktop && (
        <div className="flex flex-col gap-5">
          {/* Nearby places strip */}
          {!placesLoading && homePlaces.length > 0 && (
            <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-surface border border-border rounded-[10px] flex items-center justify-center text-olive flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-display font-bold text-ink mb-0.5">{toArabicNumerals(homePlaces.length)} محلات قريبة منك</div>
                  <div className="text-[11.5px] text-mist truncate">
                    {homePlaces.slice(0, 4).map((p, i) => (
                      <span key={p.id}>{i > 0 && <span className="mx-1 text-mist">-</span>}{p.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href="/places/map"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] text-slate font-semibold hover:border-olive/40 hover:text-olive transition-colors flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                عرض الخريطة
              </Link>
            </div>
          )}

          {/* Prices section */}
          <div>
              {/* Section header */}
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-[18px] font-bold text-ink tracking-tight m-0">الأسعار</h2>
                  <div className="text-[12px] text-mist mt-0.5">{toArabicNumerals(allReports.length || products.length)} نتيجة{area?.name_ar ? ` في ${area.name_ar}` : ""}</div>
                </div>
                <div className="flex gap-1.5 items-center flex-wrap">
                  <button
                    onClick={() => { setDesktopAreaFilter("all"); setDesktopPage(0); }}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold cursor-pointer transition-all border ${desktopAreaFilter === "all" ? "bg-olive text-white border-olive" : "bg-surface text-mist border-border hover:border-olive/40 hover:text-ink"}`}
                  >الكل</button>
                  <button
                    onClick={() => { setDesktopAreaFilter("myArea"); setDesktopPage(0); }}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold cursor-pointer transition-all border ${desktopAreaFilter === "myArea" ? "bg-olive text-white border-olive" : "bg-surface text-mist border-border hover:border-olive/40 hover:text-ink"}`}
                  >منطقتي</button>
                </div>
              </div>

              {/* Paginated list — 10 items per page */}
              <div>
                {showSkeletons ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-surface rounded-[14px] border border-border p-[18px] animate-pulse">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-2.5">
                            <div className="h-4 w-28 bg-fog rounded" />
                            <div className="h-3 w-36 bg-fog rounded" />
                            <div className="h-3 w-24 bg-fog rounded" />
                          </div>
                          <div className="h-8 w-16 bg-fog rounded" />
                        </div>
                        <div className="h-px bg-fog my-3.5" />
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <div className="h-7 w-20 bg-fog rounded-full" />
                            <div className="h-7 w-16 bg-fog rounded-full" />
                          </div>
                          <div className="h-3 w-16 bg-fog rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="px-4 py-6 text-center text-sm text-red-600">{error}</div>
                ) : isAllTab ? (
                  allReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="font-display font-bold text-ink mb-1">{activeAreaId ? "لا أسعار في منطقتك حالياً" : "لا أسعار حالياً"}</div>
                      <div className="text-sm text-mist">كن أول من يضيف سعراً</div>
                    </div>
                  ) : (
                    (() => {
                      const PAGE_SIZE = 18;
                      const totalPages = Math.ceil(allReports.length / PAGE_SIZE);
                      const pageReports = allReports.slice(desktopPage * PAGE_SIZE, (desktopPage + 1) * PAGE_SIZE);
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                          {pageReports.map((report) => (
                            <ReportCard key={report.id} report={report} />
                          ))}
                          </div>
                          {totalPages > 1 && (
                            <div className="py-3 flex items-center justify-center gap-2 border-t border-border/40">
                              <button
                                type="button"
                                onClick={() => setDesktopPage((p) => Math.max(0, p - 1))}
                                disabled={desktopPage === 0}
                                className="px-3 py-1.5 rounded-lg bg-fog text-ink text-[12px] font-medium disabled:opacity-30 hover:bg-border/50 transition-colors"
                              >
                                السابق
                              </button>
                              <span className="text-[12px] text-mist">
                                <span className="text-olive font-bold">{toArabicNumerals(desktopPage + 1)}</span> / {toArabicNumerals(totalPages)}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setDesktopPage((p) => p + 1); if (desktopPage + 2 >= totalPages && hasNextReports) fetchNextReports(); }}
                                disabled={desktopPage + 1 >= totalPages && !hasNextReports}
                                className="px-3 py-1.5 rounded-lg bg-fog text-ink text-[12px] font-medium disabled:opacity-30 hover:bg-border/50 transition-colors"
                              >
                                التالي
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()
                  )
                ) : !effectiveCategoryId ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="font-display font-bold text-ink mb-1">لا توجد فئات</div>
                    <div className="text-sm text-mist">لم يتم العثور على فئات منتجات</div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="font-display font-bold text-ink mb-1">{activeAreaId ? "لا أسعار في منطقتك لهذه الفئة" : "لا منتجات في هذه الفئة"}</div>
                    <div className="text-sm text-mist">{activeAreaId ? "جرب فئة أخرى أو غيّر المنطقة أعلاه" : "جرب فئة أخرى أو ابحث عن منتج أعلاه"}</div>
                  </div>
                ) : (
                  (() => {
                    const PAGE_SIZE = 18;
                    const totalPages = Math.ceil(products.length / PAGE_SIZE);
                    const pageProducts = products.slice(desktopPage * PAGE_SIZE, (desktopPage + 1) * PAGE_SIZE);
                    return (
                      <>
                        {pageProducts.map((product) => (
                          <HomeProductCard key={product.id} product={product} areaId={activeAreaId} isRefetching={productsFetching} />
                        ))}
                        {totalPages > 1 && (
                          <div className="py-3 flex items-center justify-center gap-2 border-t border-border/40">
                            <button
                              type="button"
                              onClick={() => setDesktopPage((p) => Math.max(0, p - 1))}
                              disabled={desktopPage === 0}
                              className="px-3 py-1.5 rounded-lg bg-fog text-ink text-[12px] font-medium disabled:opacity-30 hover:bg-border/50 transition-colors"
                            >
                              السابق
                            </button>
                            <span className="text-[12px] text-mist">
                              <span className="text-olive font-bold">{toArabicNumerals(desktopPage + 1)}</span> / {toArabicNumerals(totalPages)}
                            </span>
                            <button
                              type="button"
                              onClick={() => { setDesktopPage((p) => p + 1); if (desktopPage + 2 >= totalPages && hasNextPage) fetchNextPage(); }}
                              disabled={desktopPage + 1 >= totalPages && !hasNextPage}
                              className="px-3 py-1.5 rounded-lg bg-fog text-ink text-[12px] font-medium disabled:opacity-30 hover:bg-border/50 transition-colors"
                            >
                              التالي
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>

        </div>
      )}

      {/* ═══ Mobile layout (unchanged) ═══ */}
      {!isDesktop && (
        <>
          {/* Category tabs */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0 bg-surface border-b border-border">
            <button
              key={ALL_CATEGORY_ID}
              ref={isAllTab ? scrollToSelected : undefined}
              type="button"
              onClick={() => selectCategory(ALL_CATEGORY_ID)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                isAllTab
                  ? "bg-olive-pale border-olive text-olive font-semibold"
                  : "bg-surface border-border text-slate hover:border-olive/50"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <CategoryIcon name="__all__" size={14} />
                الكل
              </span>
            </button>
            {hasCategories ? (
              sortedCategories.map((c: Category) => {
                const isSelected = !isAllTab && effectiveCategoryId === c.id;
                return (
                  <button
                    key={c.id}
                    ref={isSelected ? scrollToSelected : undefined}
                    type="button"
                    onClick={() => selectCategory(c.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                      isSelected
                        ? "bg-olive-pale border-olive text-olive font-semibold"
                        : "bg-surface border-border text-slate hover:border-olive/50"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon name={c.name_ar} size={14} />
                      {c.name_ar}
                    </span>
                  </button>
                );
              })
            ) : categoriesLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-16 rounded-full bg-border/50 animate-pulse flex-shrink-0" />
              ))
            ) : (
              <div className="text-xs text-mist font-body px-2">لا توجد تصنيفات</div>
            )}

            {/* Area filter — separator + pills */}
            <div className="w-px h-6 bg-border/60 flex-shrink-0 self-center mx-0.5" />
            <button
              onClick={() => setMobileAreaFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                mobileAreaFilter === "all"
                  ? "bg-olive-pale border-olive text-olive font-semibold"
                  : "bg-surface border-border text-slate hover:border-olive/50"
              }`}
            >🌍 الكل</button>
            <button
              onClick={() => setMobileAreaFilter("myArea")}
              className={`px-3 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                mobileAreaFilter === "myArea"
                  ? "bg-olive-pale border-olive text-olive font-semibold"
                  : "bg-surface border-border text-slate hover:border-olive/50"
              }`}
            >📍 منطقتي</button>
          </div>

          {/* Map banner — mobile */}
          <Link
            href="/places/map"
            className="mx-4 mt-2 flex items-center gap-3 bg-olive-pale border border-olive-mid/30 rounded-xl px-4 py-3 flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-olive" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[13px] text-olive-deep">الأماكن القريبة</div>
              <div className="text-[11px] text-olive">اكتشف المحلات والمطاعم حولك على الخريطة</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-olive flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>

          <div className="flex-1 overflow-y-auto no-scrollbar py-3 pb-24">
            {showSkeletons ? (
              <div className="px-4">
                {[...Array(isSlow ? 3 : 6)].map((_, i) => (
                  <HomeProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="mx-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
            ) : isAllTab ? (
              allReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="font-display font-bold text-ink mb-1">{activeAreaId ? "لا أسعار في منطقتك حالياً" : "لا أسعار حالياً"}</div>
                  <div className="text-sm text-mist">كن أول من يضيف سعراً</div>
                </div>
              ) : (
                <div className="px-4 space-y-3">
                  {allReports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                  {isFetchingNextReports && (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <HomeProductCardSkeleton key={i} />
                      ))}
                    </div>
                  )}
                  {hasNextReports && !isFetchingNextReports && (
                    <div className="py-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => fetchNextReports()}
                        className="px-5 py-2.5 rounded-xl bg-olive-pale border border-olive-mid text-olive text-sm font-body font-medium"
                      >
                        تحميل المزيد
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : !effectiveCategoryId ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="font-display font-bold text-ink mb-1">لا توجد فئات</div>
                <div className="text-sm text-mist">لم يتم العثور على فئات منتجات</div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="font-display font-bold text-ink mb-1">{activeAreaId ? "لا أسعار في منطقتك لهذه الفئة" : "لا منتجات في هذه الفئة"}</div>
                <div className="text-sm text-mist">{activeAreaId ? "جرب فئة أخرى أو غيّر المنطقة أعلاه" : "جرب فئة أخرى أو ابحث عن منتج أعلاه"}</div>
              </div>
            ) : (
              <>
                {products.map((product) => (
                  <HomeProductCard key={product.id} product={product} areaId={activeAreaId} isRefetching={productsFetching} />
                ))}
                {isFetchingNextPage && (
                  <div className="px-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <HomeProductCardSkeleton key={i} />
                    ))}
                  </div>
                )}
                {hasNextPage && !isFetchingNextPage && (
                  <div className="px-4 pt-2 pb-4">
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      className="w-full py-3 rounded-xl border-[1.5px] border-olive text-olive font-display font-bold text-sm hover:bg-olive-pale transition-colors"
                    >
                      تحميل المزيد
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
