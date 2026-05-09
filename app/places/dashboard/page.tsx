"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAreas } from "@/lib/queries/hooks";
import { apiFetch } from "@/lib/api/fetch";
import { DashboardOrders } from "@/components/places/DashboardOrders";
import { DashboardDiscountCodes } from "@/components/places/DashboardDiscountCodes";
import { DashboardNotifications } from "@/components/places/DashboardNotifications";
import { QRCodeSVG } from "qrcode.react";
import { getItemIcon, getItemBgColor } from "@/components/places/FoodIcons";
import { VerifiedBadge } from "@/components/places/VerifiedBadge";

/* ── Types ── */
type MenuItem = { id: string; name: string; description?: string | null; price: string; available: boolean; photo_url?: string | null; icon?: string | null };
type MenuSection = { id: string; name: string; items: MenuItem[] };
type PlaceData = {
  id: string; name: string; section: string; type: string;
  area?: { id: string; name_ar: string }; area_id?: string;
  address?: string | null; phone?: string | null; whatsapp?: string | null;
  is_open: boolean; status: string; plan: string;
  avatar_url?: string | null;
  plan_expires_at?: string | null; menu: MenuSection[];
  orders_enabled?: boolean;
};
type WorkspaceDetailsForm = {
  price_hour: string; price_half_day: string; price_day: string; price_week: string; price_month: string;
  total_seats: string; available_seats: string; opens_at: string; closes_at: string;
};
type WorkspaceServiceForm = { service: string; available: boolean; detail: string };
type Sheet = null | "menu" | "edit" | "plans" | "addItem" | "addSection" | "editSection" | "editItem" | "wsDetails" | "wsServices" | "addDiscount";

const STORE_CATEGORIES = [
  { label: "مواد غذائية وبقالة", icon: "🛒", types: ["بقالية عامة", "سوبرماركت", "خضار وفواكه", "لحوم", "سمك", "مخبز", "حلويات ومعجنات", "بهارات وتوابل"] },
  { label: "صحة وصيدلية", icon: "💊", types: ["صيدلية", "عيادة وطب", "مستلزمات طبية", "بصريات"] },
  { label: "ملابس وأزياء", icon: "👕", types: ["ملابس رجالي", "ملابس حريمي", "ملابس أطفال", "أحذية", "إكسسوارات", "خياطة وتعديل"] },
  { label: "منزل وأثاث", icon: "🏠", types: ["أثاث منزلي", "مفروشات وستائر", "أدوات منزلية", "كهرباء ولوازم منزلية", "نظافة ومنظفات", "أدوات صحية وسباكة"] },
  { label: "إلكترونيات وتقنية", icon: "📱", types: ["موبايل وإكسسوارات", "كمبيوتر ولاب توب", "كهربائيات", "طاقة شمسية", "إصلاح وصيانة"] },
  { label: "بناء ومواد", icon: "🏗️", types: ["مواد بناء", "حديد وألمنيوم", "دهانات وديكور", "أخشاب", "سيراميك وبلاط"] },
  { label: "تعليم وثقافة", icon: "📚", types: ["مكتبة وقرطاسية", "ألعاب أطفال", "أدوات رسم وفنون"] },
  { label: "خدمات شخصية", icon: "💈", types: ["حلاقة وصالون", "عطور وكوزمتيك", "تصوير"] },
  { label: "سيارات", icon: "🚗", types: ["قطع غيار سيارات", "كراج وميكانيك", "إطارات"] },
  { label: "زراعة وحيوانات", icon: "🌿", types: ["مستلزمات زراعية", "علف وبيطري"] },
  { label: "أخرى", icon: "📦", types: ["أخرى"] },
];
const STORE_TYPE_VALUES = Array.from(new Set(STORE_CATEGORIES.flatMap((c) => c.types)));

function resolvePublicImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  if (!base) return url;
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

/* ── Plan data ── */
const PLANS = [
  { key: "free", badge: "مجاني", tier: "ENTRY", sub: "جرّب الأساسيات بدون تكلفة", name: "Free", price: "0", badgeClass: "bg-[var(--d-subtle-bg)] text-[var(--d-text-sec)]", featured: false },
  { key: "basic", badge: "أساسي", tier: "STANDARD", sub: "إدارة كاملة لمحلك", name: "Basic", price: "100", badgeClass: "bg-[var(--d-green-bg)] text-[var(--d-green)]", featured: false },
  { key: "premium", badge: "الأفضل", tier: "PREMIUM", sub: "تجربة كاملة + تسويق احترافي", name: "Premium", price: "200", badgeClass: "bg-[var(--d-green)] text-white", featured: true },
] as const;

const FREE_FEATURES = [
  "ظهور في القائمة",
  "صفحة خاصة",
  "قائمة الأسعار",
  "Toggle مفتوح/مغلق",
  "لوحة محدودة",
];

const FREE_MISSING = [
  "صفحة الطلبات",
  "أكواد الخصم",
  "إحصائيات الزيارات",
  'شارة "موثّق"',
  "منيو + QR code",
];

const BASIC_FEATURES = [
  "كل مزايا المجاني",
  "لوحة تحكم كاملة",
  "صفحة الطلبات",
  "أكواد الخصم",
  "إحصائيات الزيارات",
  'شارة "موثّق"',
  "منيو + QR code",
];

const BASIC_MISSING = [
  "قسم الأبرز",
];

const PREMIUM_FEATURES = [
  "كل مزايا الأساسي",
  "الظهور في قسم الأبرز",
];

const PREMIUM_EXCLUSIVES = [
  "فيديو إعلان CGI & AI",
  "نشر على غزة بريس",
  "ترويج أكواد الخصم",
];

function placeLabel(type?: string, section?: string): string {
  if (section === 'workspace') return 'المساحة';
  if (type === 'restaurant') return 'المطعم';
  if (type === 'cafe') return 'الكافيه';
  if (type === 'both') return 'المطعم';
  return 'المتجر';
}

const PLAN_FEATURES: Record<string, { has: string[]; missing: string[] }> = {
  free: { has: FREE_FEATURES, missing: FREE_MISSING },
  basic: { has: BASIC_FEATURES, missing: BASIC_MISSING },
  premium: { has: PREMIUM_FEATURES, missing: [] },
};

/* ── Menu QR Card ── */
function MenuQRCard({ placeId, placeName, plan, section, onUpgrade }: { placeId: string; placeName: string; plan?: string; section?: string; onUpgrade?: () => void }) {
  const isFood = section === "food";
  const [copied, setCopied] = useState(false);
  const placeUrl = typeof window !== "undefined" ? `${window.location.origin}/places/${placeId}` : `/places/${placeId}`;
  const hasPlan = plan === "basic" || plan === "premium";

  const copyLink = () => {
    navigator.clipboard.writeText(placeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${isFood ? "شوف المنيو" : "شوف محلنا"}:\n${placeUrl}`)}`, "_blank");
  };

  const downloadQR = () => {
    const svg = document.getElementById("place-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `qr-${placeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  /* ── Free plan: locked state ── */
  if (!hasPlan) {
    return (
      <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-5 relative overflow-hidden">
        {/* Faded header */}
        <div className="opacity-55 mb-4">
          <h3 className="text-[15px] font-medium text-[var(--d-text)] mb-1">أكواد QR للمشاركة</h3>
          <p className="text-[12px] text-[var(--d-text-sec)]">{isFood ? "شارك المنيو مع زبائنك بسهولة" : "شارك محلك مع زبائنك بسهولة"}</p>
        </div>
        {/* Blurred placeholder */}
        <div className="opacity-40 blur-[2px] pointer-events-none">
          <div className="bg-[var(--d-subtle-bg)] rounded-xl h-[100px]" />
        </div>
        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--d-amber-bg)] flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="var(--d-warn-text)" strokeWidth={2} strokeLinecap="round">
              <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><rect x="18" y="18" width="4" height="4" rx="0.5"/>
            </svg>
          </div>
          <h4 className="text-[15px] font-medium text-[var(--d-text)] mb-1.5">أكواد QR غير متاحة في الباقة المجانية</h4>
          <p className="text-[12px] text-[var(--d-text-sec)] mb-3.5 max-w-[340px] leading-relaxed">رقّي باقتك إلى Basic أو Best للحصول على أكواد QR قابلة للطباعة والمشاركة</p>
          {onUpgrade && (
            <button onClick={onUpgrade} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-4 py-2 rounded-lg bg-[var(--d-green)] text-white hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              مقارنة الباقات
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Basic / Premium: active state ── */
  return (
    <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--d-text)] mb-1">أكواد QR للمشاركة</h3>
          <p className="text-[12px] text-[var(--d-text-sec)]">{isFood ? "شارك المنيو مع زبائنك بسهولة" : "شارك محلك مع زبائنك بسهولة"}</p>
        </div>
      </div>

      {/* QR card */}
      <div className="bg-[var(--d-subtle-bg)] rounded-xl p-4 flex gap-3.5 items-center">
        {/* QR code */}
        <div className="flex-shrink-0 bg-white p-1.5 rounded-lg border border-[var(--d-border)]/30">
          <QRCodeSVG
            id="place-qr-svg"
            value={placeUrl}
            size={88}
            fgColor="#4A7C59"
            bgColor="white"
            level="M"
          />
        </div>

        {/* Info + actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--d-green)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="font-medium text-[13px] text-[var(--d-text)]">{isFood ? "رابط المنيو" : "رابط المحل"}</span>
          </div>
          <p className="text-[11px] text-[var(--d-text-muted)] mb-2.5 leading-relaxed">{isFood ? "للطباعة على الطاولة أو المشاركة" : "يفتح صفحة محلك الرئيسية"}</p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadQR}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--d-border)] text-[var(--d-text)] hover:bg-[var(--d-card)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              PNG
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--d-border)] text-[var(--d-text)] hover:bg-[var(--d-card)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              {copied ? "تم ✓" : "نسخ"}
            </button>
            <button
              onClick={shareWhatsApp}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--d-border)] text-[#25D366] hover:bg-[#25D366]/5 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              واتساب
            </button>
          </div>
        </div>
      </div>

      {/* Tip footer */}
      <div className="mt-3 px-3 py-2.5 bg-[var(--d-blue-bg)] rounded-xl flex gap-2 items-start">
        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--d-blue-text)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"/></svg>
        <span className="text-[11px] text-[var(--d-blue-text)] leading-relaxed">{isFood ? "اطبع QR وضعه على طاولات المطعم ليتصفح الزبون المنيو من جواله مباشرة" : "اطبع QR وضعه في محلك ليصل الزبائن لصفحتك مباشرة"}</span>
      </div>
    </div>
  );
}

/* ── Feature check/x icons ── */
const CheckIcon = () => (
  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] flex-shrink-0">
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </span>
);
const XIcon = () => (
  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] flex-shrink-0">
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  </span>
);

/* ── Upgrade CTA content per feature ── */
const UPGRADE_CONTENT: Record<string, { icon: React.ReactNode; title: string; desc: string; benefits: string[] }> = {
  orders: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h2l1 12h12l1-12h2"/><path d="M8 7V5a4 4 0 018 0v2"/><circle cx="12" cy="13" r="1.5" fill="currentColor"/>
      </svg>
    ),
    title: "نظّم طلبات محلك في مكان واحد",
    desc: "تابع كل طلب من لحظة الاستلام للتسليم، بدون ما يضيع منك ولا واحد",
    benefits: [
      "تصنيف الطلبات حسب الحالة (تحضير، جاهز، مرفوض)",
      "تواصل مباشر مع الزبون عبر واتساب",
      "سجل كامل لكل الطلبات الماضية",
    ],
  },
  discounts: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    title: "زوّد مبيعاتك بأكواد خصم ذكية",
    desc: "أنشئ أكواد خصم مخصصة لزبائنك وتابع استخدامها لحظة بلحظة",
    benefits: [
      "أكواد خصم بنسبة أو مبلغ ثابت",
      "تحديد حد أدنى للطلب وعدد استخدامات",
      "تاريخ انتهاء تلقائي للعروض",
    ],
  },
};

/* ── Upgrade CTA shown when free plan tries to access gated features ── */
function UpgradeCTA({ feature, onUpgrade, onCompare }: { feature: "orders" | "discounts"; onUpgrade: () => void; onCompare: () => void }) {
  const content = UPGRADE_CONTENT[feature];
  return (
    <div className="flex items-center justify-center py-6 px-4 min-h-[calc(100vh-200px)]">
      <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-7 max-w-[460px] w-full text-center relative">
        <div className="absolute top-3.5 left-3.5 text-[10.5px] text-[var(--d-text-muted)] tracking-[0.5px]">UPGRADE</div>

        <div className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-full bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] mb-4">
          {content.icon}
        </div>

        <h3 className="text-[20px] font-medium text-[var(--d-text)] mb-2">{content.title}</h3>
        <p className="text-[13.5px] text-[var(--d-text-sec)] mb-6 leading-[1.7]">{content.desc}</p>

        <ul className="text-right space-y-2.5 mb-6">
          {content.benefits.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-[13px] text-[var(--d-text)]">
              <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 mb-3.5">
          <div className="text-right">
            <div className="text-[11px] text-[var(--d-text-sec)] mb-0.5">باقة الأساسي</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[18px] font-medium text-[var(--d-text)]">100</span>
              <span className="text-[12px] text-[var(--d-text-sec)]">₪ / شهر</span>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="bg-[var(--d-green)] text-white font-medium text-[13px] rounded-xl px-[18px] py-2.5 whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            ترقية الآن
          </button>
        </div>

        <button onClick={onCompare} className="text-[12.5px] text-[var(--d-text-sec)] border-b border-[var(--d-border)]/50 pb-px hover:text-[var(--d-text)] transition-colors">
          قارن كل الباقات
        </button>
      </div>
    </div>
  );
}

export default function OwnerDashboardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1117] flex items-center justify-center" dir="rtl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--d-green)] border-t-transparent" />
        </div>
      }
    >
      <OwnerDashboardPage />
    </Suspense>
  );
}

function OwnerDashboardPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];

  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [lastOrderEvent, setLastOrderEvent] = useState<{ type: "order_created" | "order_updated"; order: any } | null>(null);
  const queryClient = useQueryClient();

  const handleOrderEvent = useCallback((type: "order_created" | "order_updated", order: any) => {
    setLastOrderEvent({ type, order });
    // Inject directly into React Query cache so orders appear instantly even if DashboardOrders isn't mounted
    const qk = ["dashboard-orders", token];
    if (type === "order_created") {
      queryClient.setQueryData<any[]>(qk, (old = []) => {
        if (old.some((o: any) => o.id === order.id)) return old;
        return [order, ...old];
      });
    } else {
      queryClient.setQueryData<any[]>(qk, (old = []) =>
        old.map((o: any) => (o.id === order.id ? order : o)),
      );
    }
  }, [token, queryClient]);
  const [activeView, setActiveView] = useState<"home" | "menu" | "orders" | "discounts" | "edit" | "plans">("home");
  const [mobileTab, setMobileTab] = useState<"home" | "orders" | "menu" | "codes" | "settings" | "plans">("home");
  const [dashSearch, setDashSearch] = useState("");
  const [menuDropdown, setMenuDropdown] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) => setCollapsedSections((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const [menuPage, setMenuPage] = useState(1);
  const [mMenuPage, setMMenuPage] = useState(1);
  const MENU_PER_PAGE = 10;
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboardTheme") !== "light";
    }
    return true;
  });

  // Prefetch discount codes & orders so tab switching is instant
  useEffect(() => {
    if (!token || !place) return;
    queryClient.prefetchQuery({
      queryKey: ["dashboard-discount-codes", token],
      queryFn: async () => {
        const res = await apiFetch(`/api/places/dashboard/discount-codes?token=${token}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
    if (place.section === "food" && place.orders_enabled) {
      queryClient.prefetchQuery({
        queryKey: ["dashboard-orders", token],
        queryFn: async () => {
          const res = await apiFetch(`/api/places/dashboard/orders?token=${token}`);
          if (!res.ok) return [];
          const data = await res.json();
          return data.data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [token, place, queryClient]);

  // Visit stats
  const [visitStats, setVisitStats] = useState<{ today: number; week: number; total: number }>({ today: 0, week: 0, total: 0 });

  // Prayer times
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; remaining: string } | null>(null);
  const [hijriDate, setHijriDate] = useState("");
  useEffect(() => {
    const PRAYER_NAMES: Record<string, string> = { Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
    const fetchPrayer = async () => {
      try {
        const now = new Date();
        const d = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${d}?city=Gaza&country=Palestine&method=4`);
        const json = await res.json();
        if (json.code !== 200) return;
        const timings = json.data.timings;
        const hijri = json.data.date.hijri;
        setHijriDate(`${hijri.day} ${hijri.month.ar} ${hijri.year}`);
        const keys = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
        const nowMins = now.getHours() * 60 + now.getMinutes();
        for (const k of keys) {
          const [h, m] = timings[k].split(" ")[0].split(":").map(Number);
          const pMins = h * 60 + m;
          if (pMins > nowMins) {
            const diff = pMins - nowMins;
            const rh = Math.floor(diff / 60);
            const rm = diff % 60;
            const remaining = rh > 0 && rm > 0 ? `${rh} ساعة و ${rm} دقيقة` : rh > 0 ? `${rh} ساعة` : `${rm} دقيقة`;
            setNextPrayer({ name: PRAYER_NAMES[k] || k, time: timings[k].split(" ")[0], remaining });
            return;
          }
        }
        // All prayers passed, show Fajr tomorrow
        setNextPrayer({ name: "الفجر", time: timings.Fajr.split(" ")[0], remaining: "غداً" });
      } catch { /* ignore */ }
    };
    fetchPrayer();
    const iv = setInterval(fetchPrayer, 60000);
    return () => clearInterval(iv);
  }, []);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [editStoreType, setEditStoreType] = useState("");
  const [saving, setSaving] = useState(false);

  // Add item form
  const [addItemSection, setAddItemSection] = useState("");
  const [addItemName, setAddItemName] = useState("");
  const [addItemPrice, setAddItemPrice] = useState("");
  const [addItemDesc, setAddItemDesc] = useState("");
  const [addItemPhoto, setAddItemPhoto] = useState("");
  const [addItemPhotoPreview, setAddItemPhotoPreview] = useState("");

  // Add section form
  const [addSectionName, setAddSectionName] = useState("");
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [sectionMenuOpen, setSectionMenuOpen] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Discount code form
  const [dcCode, setDcCode] = useState("");
  const [dcType, setDcType] = useState<"percentage" | "fixed">("percentage");
  const [dcValue, setDcValue] = useState("");
  const [dcMinOrder, setDcMinOrder] = useState("");
  const [dcMaxUses, setDcMaxUses] = useState("");
  const [dcExpires, setDcExpires] = useState("");
  const [dcEditId, setDcEditId] = useState<string | null>(null);
  const [dcFormError, setDcFormError] = useState<string | null>(null);
  const dcCodesRef = useRef<{ reload: () => void } | null>(null);

  function resetDcForm() {
    setDcCode(""); setDcType("percentage"); setDcValue("");
    setDcMinOrder(""); setDcMaxUses(""); setDcExpires(""); setDcEditId(null); setDcFormError(null);
  }

  // Edit item form
  const [editItemId, setEditItemId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemPhoto, setEditItemPhoto] = useState("");
  const [editItemPhotoPreview, setEditItemPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Action loading — tracks which action is running
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Workspace forms
  const [wsDetails, setWsDetails] = useState<WorkspaceDetailsForm>({ price_hour: '', price_half_day: '', price_day: '', price_week: '', price_month: '', total_seats: '', available_seats: '', opens_at: '', closes_at: '' });
  const [wsServices, setWsServices] = useState<WorkspaceServiceForm[]>([]);
  const [wsLoading, setWsLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const qs = `token=${token}`;
  const isWorkspace = place?.section === 'workspace';
  const itemNamePlaceholder = place?.section === "store"
    ? "مثال: اسم المنتج"
    : place?.type === "cafe"
      ? "مثال: قهوة تركية"
      : place?.type === "restaurant" || place?.type === "both"
        ? "مثال: شاورما لحمة"
        : isWorkspace
          ? "مثال: ساعة عمل مشتركة"
          : "مثال: اسم الصنف";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function normalizeImageUrl(url?: string | null): string {
    if (!url) return "";
    let out = url.trim();
    if (!/^https?:\/\//i.test(out)) {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      if (base) out = `${base}${out.startsWith("/") ? out : `/${out}`}`;
    }
    // Avoid mixed-content blocking when app runs on HTTPS.
    if (typeof window !== "undefined" && window.location.protocol === "https:" && out.startsWith("http://")) {
      out = out.replace(/^http:\/\//i, "https://");
    }
    return out;
  }

  async function compressImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    // Keep unsupported/animated formats untouched.
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
    // Small images don't need compression.
    if (file.size <= 500 * 1024) return file;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      const drawFromImage = async () => {
        const imageUrl = URL.createObjectURL(file);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = imageUrl;
          });
          const maxSide = 1024;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      };

      try {
        const bitmap = await createImageBitmap(file);
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } catch {
        // iOS/Safari may fail on some formats with createImageBitmap.
        await drawFromImage();
      }

      // For weak internet: target a very light file (~300KB).
      const targetSize = 320 * 1024;
      const qualitySteps = [0.68, 0.58, 0.5, 0.42, 0.35];
      let blob: Blob | null = null;
      let attempts = 0;
      while (attempts < 4) {
        for (const q of qualitySteps) {
          blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", q)
          );
          if (!blob) break;
          if (blob.size <= targetSize) break;
        }
        if (!blob) return file;
        if (blob.size <= targetSize) break;
        // If still too big, downscale further and retry encoding.
        const nextW = Math.max(480, Math.round(canvas.width * 0.8));
        const nextH = Math.max(480, Math.round(canvas.height * 0.8));
        const tmp = document.createElement("canvas");
        tmp.width = nextW;
        tmp.height = nextH;
        const tctx = tmp.getContext("2d");
        if (!tctx) break;
        tctx.drawImage(canvas, 0, 0, nextW, nextH);
        canvas.width = nextW;
        canvas.height = nextH;
        ctx.clearRect(0, 0, nextW, nextH);
        ctx.drawImage(tmp, 0, 0);
        attempts += 1;
      }
      if (!blob) return file;

      if (blob.size >= file.size) return file;
      const safeName = file.name.replace(/\.[^.]+$/, "");
      return new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });
    } catch {
      // Some formats (e.g. HEIC in unsupported browsers) may fail decode.
      return file;
    }
  }

  async function uploadProductPhoto(file: File): Promise<string | null> {
    setUploadingPhoto(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      const prepared = await compressImageForUpload(file);
      const fd = new FormData();
      fd.append("file", prepared);
      const uploadOnce = async () => {
        const res = await fetch(`${base}/upload/product`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        return { res, data };
      };
      let { res, data } = await uploadOnce();
      // One quick retry helps flaky mobile connections.
      if (!res.ok && (res.status >= 500 || res.status === 429)) {
        await new Promise((r) => setTimeout(r, 900));
        ({ res, data } = await uploadOnce());
      }
      if (res.ok && data.url) return normalizeImageUrl(data.url);
      showToast("فشل رفع الصورة");
      return null;
    } catch {
      showToast("فشل رفع الصورة");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }

  const load = useCallback(async () => {
    if (!token) { setError("رمز المالك مطلوب"); setLoading(false); return; }
    try {
      const res = await apiFetch(`/api/places/dashboard?${qs}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.message ?? "رمز المالك غير صحيح"); setLoading(false); return; }
      setPlace(data.data);
    } catch { setError("تعذر الاتصال بالخادم"); } finally { setLoading(false); }
  }, [token, qs]);

  useEffect(() => { load(); }, [load]);

  // Fetch visit stats when place is loaded
  useEffect(() => {
    if (!place) return;
    const fetchVisits = async () => {
      try {
        const res = await apiFetch(`/api/places/${place.id}/visit-stats`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setVisitStats(json.data);
        }
      } catch { /* ignore */ }
    };
    fetchVisits();
    const iv = setInterval(fetchVisits, 60000);
    return () => clearInterval(iv);
  }, [place?.id]);

  function populateEditForm() {
    if (!place) return;
    setEditName(place.name);
    setEditAddress(place.address ?? "");
    setEditPhone(place.phone ?? "");
    setEditWhatsapp(place.whatsapp ?? "");
    setEditAreaId(place.area_id ?? place.area?.id ?? "");
    setEditStoreType(place.type ?? "");
  }

  function openEdit() {
    setActiveView("edit");
  }

  async function handleToggleOpen() {
    if (!token || toggling) return;
    setToggling(true);
    setActionLoading("toggle-open");
    try {
      const res = await apiFetch(`/api/places/dashboard/toggle-open?${qs}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success && place) {
        setPlace({ ...place, is_open: data.is_open });
        showToast(data.is_open ? (`${placeLabel(place.type, place.section)} مفتوح الآن ✓`) : (`${placeLabel(place.type, place.section)} مغلق الآن ✓`));
      }
    } catch { showToast("حدث خطأ"); } finally { setToggling(false); setActionLoading(null); }
  }

  async function handleToggleOrders() {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/places/dashboard/toggle-orders?${qs}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success && place) {
        setPlace({ ...place, orders_enabled: data.orders_enabled });
        showToast(data.orders_enabled ? "استقبال الطلبات مفعّل ✓" : "تم إيقاف استقبال الطلبات");
      }
    } catch { showToast("حدث خطأ"); }
  }

  async function handleSaveEdit() {
    if (!token || saving) return;
    setSaving(true);
    setActionLoading("save-edit");
    try {
      const body: Record<string, string> = {};
      if (editName !== place?.name) body.name = editName;
      if (editAddress !== (place?.address ?? "")) body.address = editAddress;
      if (editPhone !== (place?.phone ?? "")) body.phone = editPhone;
      if (editWhatsapp !== (place?.whatsapp ?? "")) body.whatsapp = editWhatsapp;
      if (editAreaId !== (place?.area_id ?? place?.area?.id ?? "")) body.area_id = editAreaId;
      if (place?.section === "store" && editStoreType && editStoreType !== place?.type) body.type = editStoreType;
      const res = await apiFetch(`/api/places/dashboard/update?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        if (place) setPlace({ ...place, ...body, ...(body.area_id ? { area_id: body.area_id } : {}) });
        setSheet(null); showToast("تم الحفظ ✓");
      }
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleToggleItem(itemId: string) {
    if (!place) return;
    // Optimistic update — flip immediately in UI
    setPlace({
      ...place,
      menu: place.menu.map((sec: any) => ({
        ...sec,
        items: sec.items.map((item: any) => item.id === itemId ? { ...item, available: !item.available } : item),
      })),
    });
    setActionLoading(`toggle-item-${itemId}`);
    try {
      await apiFetch(`/api/places/dashboard/menu/items/${itemId}/toggle?${qs}`, { method: "PATCH" });
    } catch {
      // Revert on error
      await load();
      showToast("حدث خطأ");
    } finally { setActionLoading(null); }
  }

  function handleDeleteItem(itemId: string) {
    setConfirmDialog({
      message: "هل أنت متأكد من حذف هذا الصنف؟",
      onConfirm: async () => {
        setConfirmDialog(null);
        if (place) {
          // Optimistic update — remove from UI immediately
          setPlace({
            ...place,
            menu: place.menu.map((sec: any) => ({
              ...sec,
              items: sec.items.filter((item: any) => item.id !== itemId),
            })),
          });
        }
        setActionLoading(`delete-item-${itemId}`);
        try {
          await apiFetch(`/api/places/dashboard/menu/items/${itemId}/delete?${qs}`, { method: "DELETE" });
          showToast("تم الحذف ✓");
        } catch { await load(); showToast("حدث خطأ"); } finally { setActionLoading(null); }
      },
    });
  }

  function handleDeleteSection(sectionId: string) {
    setConfirmDialog({
      message: "هل أنت متأكد من حذف هذا القسم وجميع أصنافه؟",
      onConfirm: async () => {
        setConfirmDialog(null);
        if (place) {
          setPlace({ ...place, menu: place.menu.filter((sec: any) => sec.id !== sectionId) });
        }
        setActionLoading(`delete-section-${sectionId}`);
        try {
          await apiFetch(`/api/places/dashboard/menu/sections/${sectionId}/delete?${qs}`, { method: "DELETE" });
          showToast("تم الحذف ✓");
        } catch { await load(); showToast("حدث خطأ"); } finally { setActionLoading(null); }
      },
    });
  }

  function openEditItem(item: MenuItem) {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price);
    setEditItemDesc(item.description ?? "");
    setEditItemPhoto(item.photo_url ?? "");
    setEditItemPhotoPreview("");
    setSheet("editItem");
  }

  async function handleUpdateItem() {
    if (!editItemName.trim()) return;
    setSaving(true);
    setActionLoading("update-item");
    try {
      await apiFetch(`/api/places/dashboard/menu/items/${editItemId}/update?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editItemName.trim(), price: editItemPrice || "0", description: editItemDesc.trim() || null, photo_url: editItemPhoto || null }),
      });
      await load();
      setSheet(null);
      showToast("تم التعديل ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleAddItem() {
    if (!addItemName.trim() || !addItemSection) return;
    setSaving(true);
    setActionLoading("add-item");
    try {
      await apiFetch(`/api/places/dashboard/menu/items?${qs}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: addItemSection, name: addItemName.trim(), price: addItemPrice || "0", description: addItemDesc.trim() || undefined, photo_url: addItemPhoto || undefined }),
      });
      await load();
      setAddItemName(""); setAddItemPrice(""); setAddItemDesc(""); setAddItemPhoto(""); setAddItemPhotoPreview("");
      setSheet(null);
      showToast("تمت الإضافة ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleAddSection() {
    if (!addSectionName.trim()) return;
    setSaving(true);
    setActionLoading("add-section");
    try {
      await apiFetch(`/api/places/dashboard/menu/sections?${qs}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addSectionName.trim() }),
      });
      await load();
      setAddSectionName("");
      setSheet(null);
      showToast("تمت الإضافة ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleRenameSection() {
    if (!editSectionId || !editSectionName.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/places/dashboard/menu/sections/${editSectionId}/rename?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editSectionName.trim() }),
      });
      await load();
      setEditSectionId(null);
      setEditSectionName("");
      setSheet(null);
      showToast("تم التعديل ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); }
  }

  async function handleSaveDiscount() {
    setDcFormError(null);
    if (!dcCode.trim() || !dcValue.trim()) return;
    if (dcExpires) {
      const expDate = new Date(dcExpires);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        setDcFormError("لا يمكن إضافة كود بتاريخ انتهاء في الماضي");
        return;
      }
    }
    setSaving(true);
    try {
      const body = {
        code: dcCode.trim().toUpperCase(),
        discount_type: dcType,
        discount_value: Number(dcValue),
        min_order_total: dcMinOrder ? Number(dcMinOrder) : 0,
        max_uses: dcMaxUses ? Number(dcMaxUses) : null,
        expires_at: dcExpires || null,
      };
      if (dcEditId) {
        await apiFetch(`/api/places/dashboard/discount-codes/${dcEditId}?token=${token}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/api/places/dashboard/discount-codes?token=${token}`, { method: "POST", body: JSON.stringify(body) });
      }
      resetDcForm();
      setSheet(null);
      dcCodesRef.current?.reload();
      showToast(dcEditId ? "تم التحديث ✓" : "تمت الإضافة ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); }
  }

  const ALL_WS_SERVICES = ['wifi', 'electricity', 'printing', 'screens', 'private_rooms', 'drinks'];
  const WS_SERVICE_LABELS: Record<string, string> = { wifi: 'WiFi', electricity: 'كهرباء', printing: 'طباعة', screens: 'شاشات', private_rooms: 'غرف خاصة', drinks: 'مشروبات' };

  async function openWsDetails() {
    if (!place) return;
    setWsLoading(true);
    setSheet("wsDetails");
    try {
      const res = await apiFetch(`/api/places/${place.id}/workspace`);
      const data = await res.json();
      const d = data?.data?.details;
      setWsDetails({
        price_hour: d?.price_hour ?? '', price_half_day: d?.price_half_day ?? '',
        price_day: d?.price_day ?? '', price_week: d?.price_week ?? '', price_month: d?.price_month ?? '',
        total_seats: d?.total_seats?.toString() ?? '', available_seats: d?.available_seats?.toString() ?? '',
        opens_at: d?.opens_at?.slice(0,5) ?? '', closes_at: d?.closes_at?.slice(0,5) ?? '',
      });
    } catch {} finally { setWsLoading(false); }
  }

  async function openWsServices() {
    if (!place) return;
    setWsLoading(true);
    setSheet("wsServices");
    try {
      const res = await apiFetch(`/api/places/${place.id}/workspace`);
      const data = await res.json();
      const existing = data?.data?.services || [];
      setWsServices(ALL_WS_SERVICES.map(s => {
        const found = existing.find((e: any) => e.service === s);
        return { service: s, available: found?.available ?? false, detail: found?.detail ?? '' };
      }));
    } catch {} finally { setWsLoading(false); }
  }

  async function handleSaveWsDetails() {
    if (!place || !token) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (wsDetails.price_hour) body.price_hour = Number(wsDetails.price_hour);
      if (wsDetails.price_half_day) body.price_half_day = Number(wsDetails.price_half_day);
      if (wsDetails.price_day) body.price_day = Number(wsDetails.price_day);
      if (wsDetails.price_week) body.price_week = Number(wsDetails.price_week);
      if (wsDetails.price_month) body.price_month = Number(wsDetails.price_month);
      if (wsDetails.total_seats) body.total_seats = Number(wsDetails.total_seats);
      if (wsDetails.available_seats) body.available_seats = Number(wsDetails.available_seats);
      if (wsDetails.opens_at) body.opens_at = wsDetails.opens_at;
      if (wsDetails.closes_at) body.closes_at = wsDetails.closes_at;
      await apiFetch(`/api/places/${place.id}/workspace/details?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      showToast("تم الحفظ ✓");
      setSheet(null);
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); }
  }

  async function handleSaveWsServices() {
    if (!place || !token) return;
    setSaving(true);
    try {
      const services = wsServices.filter(s => s.available).map(s => ({
        service: s.service, available: true, detail: s.detail || undefined,
      }));
      await apiFetch(`/api/places/${place.id}/workspace/services?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services }),
      });
      showToast("تم الحفظ ✓");
      setSheet(null);
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); }
  }

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="min-h-screen bg-[var(--d-subtle-bg)] flex items-center justify-center" dir="rtl">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--d-green)] border-t-transparent" />
    </div>
  );
  if (error || !place) return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center">
        <h1 className="text-lg font-bold text-[#E5E7EB] mb-2">{error ?? "رمز غير صحيح"}</h1>
        <p className="text-sm text-[var(--d-text-muted)]">تأكد من الرابط الذي حصلت عليه من فريق غزة بريس.</p>
      </div>
    </div>
  );

  const totalItems = place.menu.reduce((a, s) => a + s.items.length, 0);
  const availableItems = place.menu.reduce((a, s) => a + s.items.filter((i) => i.available).length, 0);
  const planLabels: Record<string, string> = { free: "مجانية", basic: "أساسي", premium: "الأفضل" };

  // Theme colors
  const t = isDark ? {
    pageBg: "#0F1115", card: "#20283A", border: "#2B3446", cardHover: "#252830",
    text: "#F3F4F6", textSec: "#B0B7C3", textMuted: "#6B7280",
    green: "#5B9A6A", greenBg: "#1A2E22", greenBgHover: "#1B2A22",
    indigoBg: "#1E2340", grayBg: "#1E2128", subtleBg: "#3A4458",
    redBg: "#2D1B1B", toggleOff: "#374151", navShadow: "rgba(0,0,0,0.3)",
    sheetBg: "#0F1117", inputBg: "#252830", inputBorder: "#2B3446",
    cancelBg: "#252830", overlayBg: "#20283A", iconColor: "#BFC7D5",
    // Accent color pairs
    mintBg: "#1A2E22", mintText: "#6ECF97",
    amberBg: "#2D2516", amberText: "#D4A54A",
    blueBg: "#1A2538", blueText: "#6BA3D6",
    purpleBg: "#1E1D30", purpleText: "#9B8FE8", purpleDeep: "#C4BFF0",
    readyBg: "#1A2E1A", readyText: "#7CB342",
    redText: "#EF8A8A", redAccent: "#E57373",
    grayAltBg: "#2A2D37", grayAltText: "#9CA3AF",
    pendingBg: "#2D2516", pendingText: "#D4A54A",
    warnText: "#FF8A65",
  } : {
    pageBg: "#F4F7F9", card: "#ffffff", border: "#E5E7EB", cardHover: "#F2FAF5",
    text: "#111827", textSec: "#374151", textMuted: "#9CA3AF",
    green: "#4A7C59", greenBg: "#EBF3EE", greenBgHover: "#DCE9E0",
    indigoBg: "#EEF2FF", grayBg: "#F1F5F9", subtleBg: "#F3F4F6",
    redBg: "#FEF2F2", toggleOff: "#E5E7EB", navShadow: "rgba(0,0,0,0.05)",
    sheetBg: "#F9FAFB", inputBg: "#ffffff", inputBorder: "#E5E7EB",
    cancelBg: "#ffffff", overlayBg: "#ffffff", iconColor: "#4A7C59",
    // Accent color pairs
    mintBg: "#E1F5EE", mintText: "#0F6E56",
    amberBg: "#FAEEDA", amberText: "#854F0B",
    blueBg: "#E6F1FB", blueText: "#0C447C",
    purpleBg: "#EEEDFE", purpleText: "#534AB7", purpleDeep: "#26215C",
    readyBg: "#EDF5E0", readyText: "#3D6B12",
    redText: "#A32D2D", redAccent: "#C05749",
    grayAltBg: "#F1EFE8", grayAltText: "#444441",
    pendingBg: "#FEF3CD", pendingText: "#7A5D0B",
    warnText: "#E05C35",
  };

  return (
    <div className="min-h-screen relative" dir="rtl" style={{
      "--d-page": t.pageBg, "--d-card": t.card, "--d-border": t.border, "--d-card-hover": t.cardHover,
      "--d-text": t.text, "--d-text-sec": t.textSec, "--d-text-muted": t.textMuted,
      "--d-green": t.green, "--d-green-bg": t.greenBg, "--d-green-bg-hover": t.greenBgHover,
      "--d-indigo-bg": t.indigoBg, "--d-gray-bg": t.grayBg, "--d-subtle-bg": t.subtleBg,
      "--d-red-bg": t.redBg, "--d-toggle-off": t.toggleOff, "--d-input-bg": t.inputBg,
      "--d-input-border": t.inputBorder, "--d-cancel-bg": t.cancelBg, "--d-overlay": t.overlayBg,
      "--d-mint-bg": t.mintBg, "--d-mint-text": t.mintText,
      "--d-amber-bg": t.amberBg, "--d-amber-text": t.amberText,
      "--d-blue-bg": t.blueBg, "--d-blue-text": t.blueText,
      "--d-purple-bg": t.purpleBg, "--d-purple-text": t.purpleText, "--d-purple-deep": t.purpleDeep,
      "--d-ready-bg": t.readyBg, "--d-ready-text": t.readyText,
      "--d-red-text": t.redText, "--d-red-accent": t.redAccent,
      "--d-gray-alt-bg": t.grayAltBg, "--d-gray-alt-text": t.grayAltText,
      "--d-pending-bg": t.pendingBg, "--d-pending-text": t.pendingText,
      "--d-warn-text": t.warnText, "--d-icon-color": t.iconColor,
      backgroundColor: t.pageBg, color: t.text,
    } as React.CSSProperties}>
      {/* ══ GREEN HEADER ══ */}
      <div className="bg-[var(--d-green)] px-4 pt-4 pb-3 relative z-[10] lg:pt-3 lg:pb-4 lg:px-6">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-white/5 -top-[70px] -left-[50px] pointer-events-none" />
        <div className="absolute w-[120px] h-[120px] rounded-full bg-white/[0.04] -bottom-10 -right-5 pointer-events-none" />

        {/* Top bar */}
        <div>
          <div className="flex items-center justify-between mb-4 lg:mb-0 relative z-[1]">
            <button onClick={() => { setActiveView("home"); setMobileTab("home"); }} className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="w-8 h-8 rounded-full" />
              <span className="font-bold text-xl text-white leading-none">
                غزة <span className="text-[#C9A96E]">بريس</span>
              </span>
            </button>

            {/* Desktop: search + icons inline */}
            <div className="flex items-center gap-2">
              {/* Search bar — desktop inline */}
              <div className="relative hidden lg:block">
                <svg viewBox="0 0 24 24" className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={dashSearch}
                  onChange={(e) => setDashSearch(e.target.value)}
                  placeholder={activeView === "orders" ? "ابحث باسم الزبون أو رقم الطلب..." : activeView === "menu" ? "ابحث عن صنف..." : activeView === "discounts" ? "ابحث عن كود..." : "بحث..."}
                  className="w-[260px] bg-white/[0.12] border border-white/[0.15] rounded-full pr-9 pl-8 py-1.5 text-[11px] text-white placeholder:text-white/40 outline-none focus:bg-white/[0.18] focus:border-white/30 focus:w-[320px] transition-all"
                />
                {dashSearch && (
                  <button onClick={() => setDashSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              <DashboardNotifications token={token!} ordersEnabled={place.orders_enabled ?? false} isDark={isDark} onOrderEvent={handleOrderEvent} onNavigateToOrders={() => setActiveView("orders")} />
              <button
                onClick={() => { const next = !isDark; setIsDark(next); localStorage.setItem("dashboardTheme", next ? "dark" : "light"); }}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors"
                title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {isDark ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={5}/><line x1={12} y1={1} x2={12} y2={3}/><line x1={12} y1={21} x2={12} y2={23}/><line x1={4.22} y1={4.22} x2={5.64} y2={5.64}/><line x1={18.36} y1={18.36} x2={19.78} y2={19.78}/><line x1={1} y1={12} x2={3} y2={12}/><line x1={21} y1={12} x2={23} y2={12}/><line x1={4.22} y1={19.78} x2={5.64} y2={18.36}/><line x1={18.36} y1={5.64} x2={19.78} y2={4.22}/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                )}
              </button>
              <span className="text-[10px] font-bold text-white/50 bg-white/10 rounded-full px-2.5 py-1 lg:text-xs lg:px-4 lg:py-1.5">لوحة التحكم</span>
            </div>
          </div>

          {/* Place identity — mobile only in header */}
          <div className={`flex items-center gap-3 relative z-[1] lg:hidden ${mobileTab === "home" || mobileTab === "settings" ? "mb-0" : "mb-3"}`}>
            <div className="w-[42px] h-[42px] rounded-full bg-white/[0.14] border-[1.5px] border-white/[0.22] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
              {place.avatar_url ? (
                <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : <span className="text-white font-medium">{place.name.charAt(0)}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px] text-white truncate">{place.name}</span>
                <VerifiedBadge plan={place.plan} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {place.area && <span className="text-[10px] text-white/55">{place.area.name_ar}</span>}
                <span className="text-[9px] font-medium py-0.5 px-2 rounded-full bg-white/[0.14] text-white/85">
                  {place.type}
                </span>
              </div>
            </div>
            {/* Notifications bell — mobile */}
            <DashboardNotifications token={token!} ordersEnabled={place.orders_enabled ?? false} isDark={isDark} onOrderEvent={handleOrderEvent} onNavigateToOrders={() => { setMobileTab("orders"); setDashSearch(""); }} />
          </div>

          {/* Search bar — mobile (hide on home & settings) */}
          {mobileTab !== "home" && mobileTab !== "settings" && <div className="relative z-[1] lg:hidden">
            <svg viewBox="0 0 24 24" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={dashSearch}
              onChange={(e) => setDashSearch(e.target.value)}
              placeholder={mobileTab === "orders" ? "ابحث باسم الزبون أو رقم الطلب..." : mobileTab === "menu" ? "ابحث عن صنف..." : mobileTab === "codes" ? "ابحث عن كود..." : "بحث..."}
              className="w-full bg-white/[0.12] border border-white/[0.15] rounded-full pr-10 pl-9 py-2.5 text-[12px] text-white placeholder:text-white/40 outline-none focus:bg-white/[0.18] focus:border-white/30 transition-colors"
            />
            {dashSearch && (
              <button onClick={() => setDashSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>}
        </div>
      </div>

      {/* ══ MOBILE LAYOUT ══ */}
      <div className="lg:hidden px-4 pt-5 pb-24 min-h-[calc(100vh-140px)]">

        {/* ── HOME TAB ── */}
        {mobileTab === "home" && (
          <>
            {/* Green hero banner — mobile */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-[#4A7C59] to-[#6BA880] p-4 text-white mb-3">
              <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/[0.08]" />
              <div className="absolute -bottom-10 left-16 w-24 h-24 rounded-full bg-white/[0.06]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] bg-white/[0.18] px-2 py-[2px] rounded-full">{planLabels[place.plan] ? `باقة ${planLabels[place.plan]}` : place.plan}</span>
                  <span className="text-[10px] opacity-75">{new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}{hijriDate ? ` · ${hijriDate}` : ""}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h2 className="text-[20px] font-semibold text-white leading-tight">أهلاً، {place.name}</h2>
                      <VerifiedBadge plan={place.plan} size="md" />
                    </div>
                    <p className="text-[12px] opacity-85 mb-2.5">محلك جاهز. خطوتك التالية: استقبال أول زبون.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white/[0.12] px-2 py-[4px] rounded-full border border-white/[0.15]">
                        <span className={`w-1.5 h-1.5 rounded-full ${place.is_open ? "bg-[#6FE090]" : "bg-[#FAC775]"}`} />
                        <span className="text-[11px]">{place.is_open ? "مفتوح" : "مغلق"}</span>
                      </div>
                      {nextPrayer && (
                        <div className="flex items-center gap-1.5 bg-white/[0.12] px-2 py-[4px] rounded-full border border-white/[0.15]">
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="opacity-85 flex-shrink-0">
                            <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.3"/>
                            <path d="M8 4v4l2.5 1.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                          <span className="text-[10px]">{nextPrayer.name} بعد <strong className="font-semibold">{nextPrayer.remaining}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* QR Code — mobile (basic/premium only) */}
                  {(place.plan === "basic" || place.plan === "premium") && (
                    <div className="flex-shrink-0 bg-white p-2 rounded-lg text-center">
                      <QRCodeSVG
                        id="place-qr-mobile-hero"
                        value={typeof window !== "undefined" ? `${window.location.origin}/places/${place.id}` : `/places/${place.id}`}
                        size={64}
                        fgColor="#4A7C59"
                        bgColor="white"
                        level="M"
                      />
                      <p className="text-[8px] text-[#4A7C59] mt-1 font-medium">{place.section === "food" ? "امسح للمنيو" : "امسح للمحل"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Open toggle */}
            <div className="flex items-center justify-between bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3 mb-3">
              <div>
                <div className={`font-bold text-[13px] ${place.is_open ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>
                  {place.is_open ? `● ${`${placeLabel(place.type, place.section)} مفتوح`} الآن` : `○ ${`${placeLabel(place.type, place.section)} مغلق`} الآن`}
                </div>
                <div className="text-[10px] text-[var(--d-text-muted)]">
                  {place.is_open ? 'يظهر للزوار كـ "مفتوح"' : 'يظهر للزوار كـ "مغلق"'}
                </div>
              </div>
              <button onClick={handleToggleOpen} disabled={toggling} className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${place.is_open ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}>
                {actionLoading === "toggle-open" ? (
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /></div>
                ) : (
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${place.is_open ? "right-[25px]" : "right-[3px]"}`} />
                )}
              </button>
            </div>

            {/* Stats + Plan */}
            {!isWorkspace && (() => {
              const pct = totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0;
              const unavailable = totalItems - availableItems;
              const circumference = 2 * Math.PI * 22;
              const dashoffset = circumference - (pct / 100) * circumference;
              return (
                <div className="mb-4 space-y-2.5">
                  {/* Section label */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-[var(--d-text-muted)] font-medium tracking-wide">{placeLabel(place.type, place.section)} بلمحة</span>
                    <div className="flex-1 h-px bg-[var(--d-border)]" />
                  </div>

                  {/* Stats card */}
                  <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-3.5">
                    {/* Availability header */}
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-[11px] text-[var(--d-text-muted)] mb-1">نسبة توفر الأصناف</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[22px] font-semibold text-[var(--d-green)] leading-none">{pct}%</span>
                          <span className="text-[10px] text-[var(--d-text-muted)]">{availableItems} من {totalItems}</span>
                        </div>
                      </div>
                      <svg width="44" height="44" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="var(--d-subtle-bg)" strokeWidth="5"/>
                        <circle cx="28" cy="28" r="22" fill="none" stroke="var(--d-green)" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" transform="rotate(-90 28 28)"/>
                      </svg>
                    </div>

                    {/* Progress bar */}
                    <div className="h-[5px] bg-[var(--d-subtle-bg)] rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-[var(--d-green)] rounded-full" style={{ width: `${pct}%` }} />
                    </div>

                    {/* Bottom stats */}
                    <div className="grid grid-cols-3 border-t border-[var(--d-border)]/50 pt-2.5">
                      <button onClick={() => setMobileTab("menu")} className="text-center border-l border-[var(--d-border)]/50 py-0.5">
                        <div className="text-[18px] font-semibold text-[var(--d-text)] leading-none mb-1 tabular-nums">{place.menu.length}</div>
                        <div className="text-[10px] text-[var(--d-text-muted)]">أقسام</div>
                      </button>
                      <button onClick={() => setMobileTab("menu")} className="text-center border-l border-[var(--d-border)]/50 py-0.5">
                        <div className="text-[18px] font-semibold text-[var(--d-text)] leading-none mb-1 tabular-nums">{totalItems}</div>
                        <div className="text-[10px] text-[var(--d-text-muted)]">أصناف</div>
                      </button>
                      <button onClick={() => setMobileTab("menu")} className="text-center py-0.5">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {unavailable > 0 && <span className="w-[4px] h-[4px] rounded-full bg-[var(--d-red-accent)]" />}
                          <span className={`text-[18px] font-semibold leading-none tabular-nums ${unavailable > 0 ? "text-[var(--d-red-accent)]" : "text-[var(--d-text)]"}`}>{unavailable}</span>
                        </div>
                        <div className={`text-[10px] ${unavailable > 0 ? "text-[var(--d-red-accent)]" : "text-[var(--d-text-muted)]"}`}>غير متوفر</div>
                      </button>
                    </div>
                  </div>

                  {/* Plan bar */}
                  <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl px-4 py-2.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--d-text-muted)] font-semibold">الباقة:</span>
                      <span className="text-[11px] font-bold py-1 px-2.5 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">{planLabels[place.plan] ?? place.plan}</span>
                    </div>
                    {place.plan !== "premium" ? (
                      <button onClick={() => setMobileTab("plans")} className="text-[11px] font-bold text-[var(--d-green)]">ترقية ←</button>
                    ) : (
                      <span className="text-[11px] font-medium text-[var(--d-green)]">الباقة الأفضل</span>
                    )}
                  </div>
                </div>
              );
            })()}
            {isWorkspace && (
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl px-4 py-2.5 flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--d-text-muted)] font-semibold">الباقة:</span>
                  <span className="text-[11px] font-bold py-1 px-2.5 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">{planLabels[place.plan] ?? place.plan}</span>
                </div>
                {place.plan !== "premium" ? (
                  <button onClick={() => setMobileTab("plans")} className="text-[11px] font-bold text-[var(--d-green)]">ترقية ←</button>
                ) : (
                  <span className="text-[11px] font-medium text-[var(--d-green)]">الباقة الأفضل</span>
                )}
              </div>
            )}
            {/* Quick actions — workspace only */}
            {isWorkspace && (
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={openWsDetails} className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3.5 text-right">
                  <div className="w-10 h-10 rounded-xl bg-[var(--d-green-bg)] flex items-center justify-center mb-2.5">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--d-green)]" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  </div>
                  <div className="font-bold text-[12px] text-[var(--d-text)]">الأسعار والأوقات</div>
                  <div className="text-[10px] text-[var(--d-text-muted)] mt-0.5">أسعار، مواعيد</div>
                </button>
                <button onClick={openWsServices} className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3.5 text-right">
                  <div className="w-10 h-10 rounded-xl bg-[var(--d-indigo-bg)] flex items-center justify-center mb-2.5">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--d-green)]" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>
                  </div>
                  <div className="font-bold text-[12px] text-[var(--d-text)]">الخدمات المتاحة</div>
                  <div className="text-[10px] text-[var(--d-text-muted)] mt-0.5">WiFi، كهرباء</div>
                </button>
              </div>
            )}

            {/* ── من زار صفحتك؟ — mobile ── */}
            <div className="mt-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[10px] text-[var(--d-text-muted)] uppercase tracking-wider font-medium">من زار صفحتك؟</span>
                <div className="flex-1 h-px bg-[var(--d-border)]/50" />
              </div>
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: "زيارات اليوم", num: visitStats.today },
                    { label: "هذا الأسبوع", num: visitStats.week },
                    { label: "الإجمالي", num: visitStats.total },
                  ].map((v, i) => (
                    <div key={v.label} className={`text-center ${i === 1 ? "border-r border-l border-[var(--d-border)]/50" : ""}`}>
                      <p className="text-[22px] font-medium text-[var(--d-text)] tabular-nums leading-none mb-1">{v.num}</p>
                      <p className="text-[10px] text-[var(--d-text-sec)]">{v.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[var(--d-blue-bg)] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--d-blue-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"/></svg>
                    <span className="text-[12px] font-medium text-[var(--d-blue-text)]">شارك محلك لتبدأ بجذب الزوار</span>
                  </div>
                  <p className="text-[11px] text-[var(--d-blue-text)] leading-relaxed">انسخ الرابط وأرسله للزبائن عبر واتساب أو ضعه في بايو حساباتك.</p>
                </div>
              </div>
            </div>

            {/* ── صفحتك العامة — mobile ── */}
            <div className="mt-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[10px] text-[var(--d-text-muted)] uppercase tracking-wider font-medium">صفحتك العامة</span>
                <div className="flex-1 h-px bg-[var(--d-border)]/50" />
              </div>
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--d-text-sec)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <p className="text-[13px] font-medium text-[var(--d-text)]">شاهد كما يراه الزبائن</p>
                </div>
                <p className="text-[11px] text-[var(--d-text-sec)] mb-2.5 leading-relaxed">افتح صفحتك وجرّب تجربة العميل الكاملة.</p>
                <div className="flex gap-1.5">
                  <a
                    href={`/places/${place.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[var(--d-border)] text-[var(--d-text)] font-medium text-[12px] rounded-xl py-2 hover:bg-[var(--d-subtle-bg)] transition-colors"
                  >
                    معاينة محلي
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/places/${place.id}`); showToast("تم نسخ الرابط ✓"); }}
                    className="flex items-center justify-center gap-1.5 border border-[var(--d-border)] text-[var(--d-text)] text-[12px] rounded-xl px-3 py-2 hover:bg-[var(--d-subtle-bg)] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    نسخ الرابط
                  </button>
                  {(place.plan === "basic" || place.plan === "premium") ? (
                    <button
                      onClick={() => {
                        const svg = document.getElementById("place-qr-mobile-hero");
                        if (!svg) return;
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement("canvas");
                        canvas.width = 512; canvas.height = 512;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        const img = new Image();
                        img.onload = () => { ctx.fillStyle = "white"; ctx.fillRect(0, 0, 512, 512); ctx.drawImage(img, 0, 0, 512, 512); const a = document.createElement("a"); a.download = `qr-${place.name}.png`; a.href = canvas.toDataURL("image/png"); a.click(); };
                        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                      }}
                      className="flex items-center justify-center gap-1.5 border border-[var(--d-green)]/30 bg-[var(--d-green-bg)] text-[var(--d-green)] text-[12px] rounded-xl px-3 py-2 hover:opacity-80 transition-opacity"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      QR
                    </button>
                  ) : (
                    <button
                      onClick={() => setMobileTab("plans")}
                      className="flex items-center justify-center gap-1.5 border border-[var(--d-amber-bg)] text-[var(--d-warn-text)] text-[12px] rounded-xl px-3 py-2 hover:bg-[var(--d-amber-bg)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><rect x="18" y="18" width="4" height="4" rx="0.5"/></svg>
                      QR · ترقية
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── ميزات بانتظارك — mobile ── */}
            {(() => {
              const isPremium = place.plan === "premium";
              const features = place.plan === "free" ? [
                { name: "الطلبات", desc: "تتبع كل طلب", icon: <><circle cx="9" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></> },
                { name: "أكواد الخصم", desc: "اجذب الزبائن", icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="var(--d-purple-text)"/></> },
                { name: "شارة التوثيق", desc: "زيد الثقة", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></> },
                { name: "منيو + QR", desc: "شارك المنيو", icon: <><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><rect x="18" y="18" width="4" height="4" rx="0.5"/></> },
              ] : place.plan === "basic" ? [
                { name: "في قسم الأبرز", desc: "ظهور مميز", icon: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></> },
                { name: "فيديو إعلان AI", desc: "إعلان احترافي", icon: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></> },
                { name: "نشر إعلان", desc: "على صفحاتنا", icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
                { name: "ترويج الأكواد", desc: "على الموقع", icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></> },
              ] : [
                { name: "الطلبات", desc: "تتبع كل طلب", icon: <><circle cx="9" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></> },
                { name: "أكواد الخصم", desc: "اجذب الزبائن", icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="var(--d-purple-text)"/></> },
                { name: "في قسم الأبرز", desc: "ظهور مميز", icon: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></> },
                { name: "فيديو إعلان AI", desc: "إعلان احترافي", icon: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></> },
              ];
              const title = isPremium ? "ميزات باقتك" : "ميزات بانتظارك";
              const sub = place.plan === "free" ? "طوّر محلك بميزات احترافية" : isPremium ? "أنت تستمتع بجميع المزايا" : "احصل على ميزات حصرية";
              const accent = "var(--d-purple-text)";
              const gradient = isDark ? "from-[#1E1D30] via-[#252040] to-[#2A1D2E]" : "from-[#EEEDFE] via-[#CECBF6] to-[#FBEAF0]";
              return (
                <div className={`mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-bl ${gradient} p-4`}>
                  <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/30" />
                  <div className="relative flex justify-between items-center mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isPremium ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        )}
                        <p className="text-[13px] font-medium" style={{ color: "var(--d-purple-deep)" }}>{title}</p>
                      </div>
                      <p className="text-[11px]" style={{ color: "var(--d-purple-text)" }}>{sub}</p>
                    </div>
                    {!isPremium && <button onClick={() => setMobileTab("plans")} className="text-[11px] px-3 py-[5px] bg-[var(--d-purple-text)] text-white rounded-lg font-medium hover:bg-[#443DA0] transition-colors">عرض الباقات ←</button>}
                  </div>
                  <div className="relative grid grid-cols-2 gap-2">
                    {features.map((f) => (
                      <div key={f.name} className="bg-[var(--d-card)]/70 rounded-xl p-2.5 text-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1">{f.icon}</svg>
                        <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--d-purple-deep)" }}>{f.name}</p>
                        <p className="text-[9px]" style={{ color: "var(--d-purple-text)" }}>{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {mobileTab === "orders" && place.section === "food" && token && (
          <div>
            {place.plan === "free" ? (
              <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl">
                <UpgradeCTA feature="orders" onUpgrade={() => setMobileTab("plans")} onCompare={() => setMobileTab("plans")} />
              </div>
            ) : (
              <DashboardOrders token={token} ordersEnabled={place.orders_enabled ?? false} onToggleOrders={handleToggleOrders} lastEvent={lastOrderEvent} mobile search={dashSearch} />
            )}
          </div>
        )}

        {/* ── MENU TAB ── */}
        {mobileTab === "menu" && !isWorkspace && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[15px] text-[var(--d-text)]">إدارة القائمة</h3>
              <button onClick={() => setSheet("addSection")} className="text-[11px] font-bold text-white bg-[var(--d-green)] rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity">+ قسم</button>
            </div>

            {(() => {
              const allItemsRaw = place.menu.flatMap((sec) => sec.items.map((item) => ({ ...item, sectionName: sec.name, sectionId: sec.id })));
              const filteredItems = dashSearch.trim()
                ? allItemsRaw.filter((item) => item.name.toLowerCase().includes(dashSearch.trim().toLowerCase()) || item.sectionName.toLowerCase().includes(dashSearch.trim().toLowerCase()))
                : allItemsRaw;

              const sectionGroups = place.menu.map((sec) => ({
                ...sec,
                filteredItems: filteredItems.filter(item => item.sectionId === sec.id),
              })).filter(s => !dashSearch.trim() || s.filteredItems.length > 0);

              return sectionGroups.map((sec) => {
                const isSectionLoading = actionLoading === `delete-section-${sec.id}`;
                const isCollapsed = collapsedSections.has(sec.id);
                return (
                  <div key={sec.id} className={`bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl ${isSectionLoading ? "pointer-events-none opacity-50" : ""}`}>
                    {isSectionLoading && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="w-5 h-5 border-2 border-[var(--d-warn-text)]/30 border-t-[var(--d-warn-text)] rounded-full animate-spin" />
                      </div>
                    )}
                    {/* Section header */}
                    <div className="px-3 py-2.5 flex items-center justify-between hover:bg-[var(--d-subtle-bg)]/50 transition-colors">
                      <button onClick={() => toggleSection(sec.id)} className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-[var(--d-text)]">{sec.name}</span>
                        <span className="text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-md bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)]">{sec.items.length}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--d-text-muted)] transition-transform ${isCollapsed ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setAddItemSection(sec.id); setSheet("addItem"); }} className="text-[10px] font-medium text-[var(--d-green)] border border-[var(--d-green)]/40 rounded-lg px-2 py-1 hover:bg-[var(--d-green-bg)] transition-colors">+ صنف</button>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setSectionMenuOpen(sectionMenuOpen === sec.id ? null : sec.id); }} className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors">
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                          </button>
                          {sectionMenuOpen === sec.id && (
                            <>
                              <div className="fixed inset-0 z-[98]" onClick={() => setSectionMenuOpen(null)} />
                              <div className="absolute left-0 top-full mt-1 z-[99] w-32 bg-[var(--d-card)] border border-[var(--d-border)] rounded-lg shadow-xl overflow-hidden">
                                <button onClick={() => { setSectionMenuOpen(null); setEditSectionId(sec.id); setEditSectionName(sec.name); setSheet("editSection"); }} className="w-full text-right px-3 py-2 text-[11px] font-medium text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors flex items-center gap-2">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  تعديل الاسم
                                </button>
                                <button onClick={() => { setSectionMenuOpen(null); handleDeleteSection(sec.id); }} disabled={!!actionLoading} className="w-full text-right px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                                  حذف القسم
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <>
                        {/* Items */}
                        {sec.filteredItems.map((item) => {
                          const isItemLoading = actionLoading === `toggle-item-${item.id}` || actionLoading === `delete-item-${item.id}`;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-2.5 px-3 py-2.5 border-t border-[var(--d-border)]/50 ${isItemLoading ? "pointer-events-none opacity-50" : ""} ${!item.available ? "opacity-55" : ""}`}
                            >
                              {/* Icon */}
                              {resolvePublicImageUrl(item.photo_url) ? (
                                <img src={resolvePublicImageUrl(item.photo_url)!} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[var(--d-icon-color)]" style={{ backgroundColor: getItemBgColor(sec.name) }}>
                                  {getItemIcon(sec.name)('w-5 h-5')}
                                </div>
                              )}
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-medium text-[var(--d-text)] truncate">{item.name}</p>
                                  {!item.available && <span className="text-[10px] font-medium px-[7px] py-px rounded-full bg-[var(--d-gray-alt-bg)] text-[var(--d-gray-alt-text)] shrink-0">غير متوفر</span>}
                                </div>
                                {item.description && <p className="text-[11px] text-[var(--d-text-muted)] truncate mt-0.5">{item.description}</p>}
                              </div>
                              {/* Price */}
                              <p className="text-[13px] font-medium text-[var(--d-text)] tabular-nums shrink-0" dir="ltr">
                                {Number(item.price) > 0 ? `₪${Number(item.price).toFixed(2)}` : "—"}
                              </p>
                              {/* Toggle */}
                              <button onClick={() => handleToggleItem(item.id)} disabled={!!actionLoading} className={`relative w-[30px] h-[17px] rounded-full transition-colors shrink-0 ${item.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}>
                                <span className={`absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white shadow transition-all ${item.available ? "left-[2px]" : "left-[15px]"}`} />
                              </button>
                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openEditItem(item)} disabled={!!actionLoading} className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--d-green)] bg-[var(--d-green-bg)]">
                                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteItem(item.id)} disabled={!!actionLoading} className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--d-warn-text)] bg-[var(--d-red-bg)]">
                                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ── CODES TAB ── */}
        {mobileTab === "codes" && place.section === "food" && token && (
          <div>
            {place.plan === "free" ? (
              <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl">
                <UpgradeCTA feature="discounts" onUpgrade={() => setMobileTab("plans")} onCompare={() => setMobileTab("plans")} />
              </div>
            ) : (
              <DashboardDiscountCodes token={token} mobile search={dashSearch} />
            )}
          </div>
        )}

        {/* ── PLANS TAB (mobile) ── */}
        {mobileTab === "plans" && (
          <div className="space-y-3">
            {/* Current plan */}
            <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--d-green-bg)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--d-green)]" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--d-text-muted)]">باقتك الحالية</p>
                  <p className="text-[14px] font-bold text-[var(--d-text)]">{planLabels[place.plan] ?? place.plan}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold py-1 px-2.5 rounded-full ${PLANS.find(p => p.key === place.plan)?.badgeClass ?? "bg-[var(--d-subtle-bg)] text-[var(--d-text-sec)]"}`}>
                {place.plan === "free" ? "مجاني" : "مفعّل"}
              </span>
            </div>

            {/* Plan cards */}
            {PLANS.map((p) => {
              const isCurrent = place.plan === p.key;
              const isSelected = selectedPlan === p.key;
              const isPaid = p.key !== "free";
              const feats = PLAN_FEATURES[p.key];
              const isDisabled = p.key === "free" && place.plan !== "free";
              return (
                <div key={p.key} className={`rounded-2xl p-4 transition-all relative ${
                  isDisabled
                    ? "bg-[var(--d-card)] border border-[var(--d-border)]/50"
                    : `bg-[var(--d-card)] ${p.featured ? "border-2 border-[var(--d-green)]" : "border border-[var(--d-border)]/50"}`
                }`}>
                  {p.featured && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[var(--d-green)] text-white text-[9px] font-medium px-3 py-1 rounded-full whitespace-nowrap">الأكثر اختياراً</div>
                  )}

                  {/* Header */}
                  <div className="mb-3">
                    <p className={`text-[10px] tracking-[0.5px] mb-1 ${p.featured ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>{p.tier}</p>
                    <h3 className="text-[16px] font-medium text-[var(--d-text)] mb-0.5">{p.badge}</h3>
                    <p className="text-[11px] text-[var(--d-text-sec)]">{p.sub}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-3 pb-3 border-b border-[var(--d-border)]/50">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-[28px] font-medium leading-none ${p.featured ? "text-[var(--d-green)]" : "text-[var(--d-text)]"}`}>{p.price}</span>
                      <span className="text-[13px] text-[var(--d-text-sec)]">₪{p.price !== "0" ? " / شهر" : ""}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-0 mb-3">
                    {feats.has.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 py-[4px] text-[11.5px] text-[var(--d-text-sec)]">
                        <CheckIcon />
                        <span>{feat}</span>
                      </li>
                    ))}
                    {feats.missing.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 py-[4px] text-[11.5px] text-[var(--d-text-muted)]">
                        <XIcon />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Premium exclusives box */}
                  {p.key === "premium" && (
                    <div className="bg-[var(--d-mint-bg)] rounded-xl p-3 mb-3">
                      <p className="text-[10px] font-medium text-[var(--d-mint-text)] mb-2 tracking-[0.3px]">★ مزايا حصرية</p>
                      <ul className="space-y-0">
                        {PREMIUM_EXCLUSIVES.map((feat) => (
                          <li key={feat} className="flex items-start gap-2 py-1 text-[11px] text-[var(--d-mint-text)]">
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--d-mint-text)]">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CTA button */}
                  {isDisabled ? (
                    <div className="w-full py-2.5 rounded-xl text-[12px] font-medium text-center text-[var(--d-text-muted)] bg-[var(--d-border)]/30 cursor-not-allowed">
                      غير متاح
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedPlan(isSelected ? null : p.key)}
                      className={`w-full py-2.5 rounded-xl text-[12px] font-medium transition-all ${
                        isCurrent
                          ? "bg-transparent text-[var(--d-mint-text)] border border-[#9FE1CB]"
                          : isSelected
                            ? "bg-[var(--d-green)] text-white"
                            : p.featured
                              ? "bg-[var(--d-green)] text-white"
                              : "bg-[var(--d-card)] text-[var(--d-mint-text)] border border-[var(--d-mint-text)]"
                      }`}
                    >
                      {isCurrent ? (<><svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="inline-block align-[-1px] ml-1"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>باقتك الحالية</>) : isSelected ? "تم الاختيار ✓" : `ترقية إلى ${p.badge}`}
                    </button>
                  )}

                  {/* Payment inside card */}
                  {isPaid && isSelected && !isCurrent && (
                    <div className="mt-3 pt-3 border-t border-[var(--d-green)]/40 text-right">
                      <div className="bg-[var(--d-subtle-bg)] rounded-xl p-3 mb-2">
                        <div className="text-[10px] text-[var(--d-text-muted)] font-semibold mb-1.5">١. حوّل المبلغ عبر بنك فلسطين</div>
                        <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <span className="text-[15px] font-bold text-[var(--d-text)] tracking-wider" dir="ltr">0567359920</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("0567359920"); }}
                            className="text-[10px] text-[var(--d-green)] font-bold bg-[var(--d-green-bg)] rounded-lg px-2.5 py-1"
                          >
                            نسخ
                          </button>
                        </div>
                      </div>
                      <div className="bg-[var(--d-subtle-bg)] rounded-xl p-3">
                        <div className="text-[10px] text-[var(--d-text-muted)] font-semibold mb-1.5">٢. أرسل إشعار التحويل للتأكيد</div>
                        <a
                          href={`https://wa.me/972567359920?text=${encodeURIComponent(`مرحباً، حوّلت ${p.price} شيكل لباقة ${p.badge} — الاسم: ${place.name}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-[#25D366] text-white font-bold text-[13px] rounded-xl py-2.5 flex items-center justify-center gap-2"
                        >
                          <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.39 0-4.598-.788-6.379-2.117l-.446-.338-2.634.883.883-2.634-.338-.446A9.723 9.723 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z" />
                          </svg>
                          إرسال عبر واتساب
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {mobileTab === "settings" && (
          <div className="space-y-3">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 p-2.5 rounded-xl text-center">
                <p className="text-[10px] text-[var(--d-text-muted)] mb-0.5">أصناف القائمة</p>
                <p className="text-[18px] font-medium text-[var(--d-text)] tabular-nums">{totalItems}</p>
              </div>
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 p-2.5 rounded-xl text-center">
                <p className="text-[10px] text-[var(--d-text-muted)] mb-0.5">الأقسام</p>
                <p className="text-[18px] font-medium text-[var(--d-text)] tabular-nums">{place.menu.length}</p>
              </div>
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 p-2.5 rounded-xl text-center">
                <p className="text-[10px] text-[var(--d-text-muted)] mb-0.5">متوفر</p>
                <p className="text-[18px] font-medium text-[var(--d-mint-text)] tabular-nums">{availableItems}</p>
              </div>
            </div>

            {/* Contact info */}
            <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--d-border)]/50">
                <h3 className="text-[13px] font-medium text-[var(--d-text)]">معلومات التواصل</h3>
                <button onClick={() => setSheet("edit")} className="text-[11px] font-medium text-[var(--d-mint-text)] hover:bg-[var(--d-subtle-bg)] px-2 py-1 rounded transition-colors">تعديل</button>
              </div>
              <div className="px-3.5 py-1">
                {place.phone && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-[var(--d-border)]/50">
                    <div className="w-7 h-7 rounded-lg bg-[var(--d-blue-bg)] flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--d-blue-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--d-text-muted)]">رقم الهاتف</p>
                      <p className="text-[12px] font-medium text-[var(--d-text)] tabular-nums mt-0.5" dir="ltr">{place.phone}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(place.phone || '')} className="w-[24px] h-[24px] inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors" title="نسخ">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </div>
                )}
                {place.whatsapp && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-[var(--d-border)]/50">
                    <div className="w-7 h-7 rounded-lg bg-[var(--d-mint-bg)] flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--d-mint-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--d-text-muted)]">واتساب</p>
                      <p className="text-[12px] font-medium text-[var(--d-text)] tabular-nums mt-0.5" dir="ltr">{place.whatsapp}</p>
                    </div>
                    <button onClick={() => window.open(`https://wa.me/${place.whatsapp?.replace(/\D/g, '')}`, '_blank')} className="w-[24px] h-[24px] inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors" title="فتح">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2.5 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--d-amber-bg)] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--d-amber-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--d-text-muted)]">المنطقة</p>
                    <p className="text-[12px] font-medium text-[var(--d-text)] mt-0.5">{place.area?.name_ar || "—"}</p>
                    {place.address && (
                      <>
                        <p className="text-[10px] text-[var(--d-text-muted)] mt-1.5">العنوان التفصيلي</p>
                        <p className="text-[12px] text-[var(--d-text)] mt-0.5 leading-relaxed">{place.address}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ══ DESKTOP LAYOUT — sidebar fixed right + content fills rest ══ */}
      <div className="hidden lg:flex px-6 pt-8 pb-6 gap-6 items-start relative z-[2] min-h-[calc(100vh-100px)]">

        {/* ── RIGHT SIDEBAR ── */}
        <div className="w-[320px] flex-shrink-0 sticky top-6 space-y-3">

          {/* Identity + open status card */}
          <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)]/50 overflow-hidden">
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-11 h-11 rounded-full bg-[var(--d-green)] flex items-center justify-center text-white text-lg font-medium flex-shrink-0 overflow-hidden">
                {place.avatar_url ? (
                  <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : place.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-medium text-[var(--d-text)] truncate">{place.name}</p>
                  <VerifiedBadge plan={place.plan} />
                </div>
                <p className="text-[12px] text-[var(--d-text-muted)] mt-0.5">{place.type}{place.area ? ` · ${place.area.name_ar}` : ""}</p>
              </div>
            </div>

            <div className="h-px bg-[var(--d-border)]/50" />

            <div className="px-3.5 py-3 flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${place.is_open ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)]" : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)]"}`}>
                <span className={`w-[7px] h-[7px] rounded-full ${place.is_open ? "bg-[var(--d-green)] shadow-[0_0_0_3px_rgba(29,158,117,0.18)]" : "bg-[var(--d-text-muted)]"}`} />
                {place.is_open ? (isWorkspace ? "مساحة مفتوحة" : "محل مفتوح") : (isWorkspace ? "مساحة مغلقة" : "محل مغلق")}
              </span>
              <button onClick={handleToggleOpen} disabled={toggling} className={`relative w-[34px] h-[19px] rounded-full transition-colors flex-shrink-0 ${place.is_open ? "bg-[var(--d-green)]" : "bg-[var(--d-border)]"}`}>
                {actionLoading === "toggle-open" ? (
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 border-[1.5px] border-white/50 border-t-white rounded-full animate-spin" /></div>
                ) : (
                  <div className={`absolute top-[2px] w-[15px] h-[15px] rounded-full bg-white shadow transition-all ${place.is_open ? "left-[2px]" : "left-[17px]"}`} />
                )}
              </button>
            </div>
            <p className="text-[11px] text-[var(--d-text-muted)] px-3.5 pb-3">
              {place.is_open ? "الزبائن يستطيعون استقبال الطلبات الآن" : "الزبائن لا يستطيعون الطلب حالياً"}
            </p>
          </div>

          {/* Stats */}
          {!isWorkspace && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { num: place.menu.length, label: "أقسام" },
                { num: totalItems, label: "صنف" },
                { num: availableItems, label: "متوفر", color: "var(--d-mint-text)" },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-3 text-center">
                  <p className="text-[11px] text-[var(--d-text-muted)] mb-1">{s.label}</p>
                  <p className="text-[22px] font-medium tabular-nums" style={{ color: s.color || "var(--d-text)" }}>{s.num}</p>
                </div>
              ))}
            </div>
          )}

          {/* Plan */}
          <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)]/50 px-3.5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[var(--d-text-muted)] mb-0.5">باقتك الحالية</p>
              <p className="text-[13px] font-medium text-[var(--d-text)]">{planLabels[place.plan] ?? place.plan}</p>
            </div>
            {place.plan !== "premium" ? (
              <button onClick={() => setActiveView("plans")} className="text-[12px] font-medium text-white bg-[var(--d-green)] rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity">ترقية الباقة</button>
            ) : (
              <span className="text-[11px] font-medium text-[var(--d-green)]">الباقة الأفضل</span>
            )}
          </div>

          {/* Actions */}
          <div>
            <p className="text-[11px] text-[var(--d-text-muted)] mb-2 pr-1 tracking-wide">الإجراءات</p>
            <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)]/50 overflow-hidden">
              <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} iconBg="bg-[var(--d-subtle-bg)]" iconColor="stroke-[var(--d-text-sec)]" title="الرئيسية" sub="نظرة عامة على محلك" onClick={() => setActiveView("home")} active={activeView === "home"} />
              {place.section === "food" && token && (
                <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M3 7h18l-2 13H5L3 7z"/><path d="M8 7V5a4 4 0 018 0v2"/></svg>} iconBg="bg-[var(--d-amber-bg)]" iconColor="stroke-[var(--d-amber-text)]" title="الطلبات" sub="إدارة طلبات الزبائن وتحديث حالتها" onClick={() => setActiveView("orders")} active={activeView === "orders"} />
              )}
              {isWorkspace ? (
                <>
                  <ActionItem icon={<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>} iconBg="bg-[var(--d-mint-bg)]" iconColor="stroke-[var(--d-mint-text)]" title="الأسعار والأوقات" sub="أسعار الساعة/اليوم، مواعيد العمل" onClick={openWsDetails} />
                  <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>} iconBg="bg-[var(--d-blue-bg)]" iconColor="stroke-[var(--d-blue-text)]" title="الخدمات المتاحة" sub="WiFi، كهرباء، طباعة، مشروبات" onClick={openWsServices} />
                </>
              ) : (
                <ActionItem icon={<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>} iconBg="bg-[var(--d-mint-bg)]" iconColor="stroke-[var(--d-mint-text)]" title="إدارة القائمة" sub="تعديل الأسعار والتوفر" badge={<span className="text-[11px] font-medium py-0.5 px-[7px] rounded-full bg-[var(--d-mint-bg)] text-[var(--d-mint-text)]">{totalItems} صنف</span>} onClick={() => setActiveView("menu")} active={activeView === "menu"} />
              )}
              {place.section === "food" && token && (
                <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M20 12l-8 8-9-9V3h8l9 9z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>} iconBg="bg-[var(--d-purple-bg)]" iconColor="stroke-[var(--d-purple-text)]" title="أكواد الخصم" sub="إنشاء وإدارة أكواد الخصم" onClick={() => setActiveView("discounts")} active={activeView === "discounts"} />
              )}
              <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>} iconBg="bg-[var(--d-amber-bg)]" iconColor="stroke-[var(--d-warn-text)]" title="الباقات" sub="اختر الباقة المناسبة لمحلك" onClick={() => setActiveView("plans")} active={activeView === "plans"} />
              <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} iconBg="bg-[var(--d-blue-bg)]" iconColor="stroke-[var(--d-blue-text)]" title={`بروفايل ${placeLabel(place.type, place.section)}`} sub="الاسم، الصورة، المنطقة، التواصل" onClick={openEdit} last />
            </div>
          </div>

        </div>

        {/* ── LEFT MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ══ HOME PAGE ══ */}
          {activeView === "home" && (() => {
            const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

            return (
            <div className="space-y-6">

              {/* ── Green hero banner ── */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-[#4A7C59] to-[#6BA880] p-6 text-white">
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/[0.08]" />
                <div className="absolute -bottom-[60px] left-20 w-[120px] h-[120px] rounded-full bg-white/[0.06]" />
                <div className="relative flex justify-between items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[11px] bg-white/[0.18] px-2.5 py-[3px] rounded-full tracking-wide">{planLabels[place.plan] ? `باقة ${planLabels[place.plan]}` : place.plan}</span>
                      <span className="text-[12px] opacity-75">{today}{hijriDate ? ` · ${hijriDate}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-[26px] font-semibold text-white leading-tight">أهلاً، {place.name}</h2>
                      <VerifiedBadge plan={place.plan} size="md" />
                    </div>
                    <p className="text-[13px] opacity-85 mb-3.5">محلك جاهز. خطوتك التالية: استقبال أول زبون.</p>

                    <div className="flex items-center gap-3">
                      {/* Shop status */}
                      <div className="flex items-center gap-1.5 bg-white/[0.12] px-2.5 py-[5px] rounded-full border border-white/[0.15]">
                        <span className={`w-1.5 h-1.5 rounded-full ${place.is_open ? "bg-[#6FE090]" : "bg-[#FAC775]"}`} />
                        <span className="text-[12px]">{place.is_open ? "مفتوح" : "مغلق حالياً"}</span>
                      </div>
                      {/* Prayer time */}
                      {nextPrayer && (
                        <div className="flex items-center gap-2 bg-white/[0.12] px-3 py-[5px] rounded-full border border-white/[0.15]">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-85 flex-shrink-0">
                            <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.3"/>
                            <path d="M8 4v4l2.5 1.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                          <span className="text-[12px]">أذان {nextPrayer.name} بعد <strong className="font-semibold">{nextPrayer.remaining}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code (basic/premium only) */}
                  {(place.plan === "basic" || place.plan === "premium") && (
                    <div className="flex-shrink-0 bg-white p-3 rounded-xl text-center">
                      <QRCodeSVG
                        id="place-qr-hero"
                        value={typeof window !== "undefined" ? `${window.location.origin}/places/${place.id}` : `/places/${place.id}`}
                        size={100}
                        fgColor="#4A7C59"
                        bgColor="white"
                        level="M"
                      />
                      <p className="text-[10px] text-[#4A7C59] mt-1.5 font-medium">{place.section === "food" ? "امسح للمنيو" : "امسح للوصول للمحل"}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Visits ── */}
              <div>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-[11px] text-[var(--d-text-muted)] uppercase tracking-wider font-medium">من زار صفحتك؟</span>
                  <div className="flex-1 h-px bg-[var(--d-border)]/50" />
                </div>
                <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-5">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                      { label: "زيارات اليوم", num: visitStats.today },
                      { label: "هذا الأسبوع", num: visitStats.week },
                      { label: "الإجمالي", num: visitStats.total },
                    ].map((v, i) => (
                      <div key={v.label} className={`text-center ${i === 1 ? "border-r border-l border-[var(--d-border)]/50" : ""}`}>
                        <p className="text-[28px] font-medium text-[var(--d-text)] tabular-nums leading-none mb-1.5">{v.num}</p>
                        <p className="text-[11px] text-[var(--d-text-sec)]">{v.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Blue tip */}
                  <div className="bg-[var(--d-blue-bg)] rounded-xl px-3.5 py-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--d-blue-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"/></svg>
                      <span className="text-[13px] font-medium text-[var(--d-blue-text)]">شارك محلك لتبدأ بجذب الزوار</span>
                    </div>
                    <p className="text-[12px] text-[var(--d-blue-text)] leading-relaxed">انسخ الرابط وأرسله للزبائن عبر واتساب أو ضعه في بايو حساباتك على السوشال ميديا.</p>
                  </div>

                  {/* Locked analytics */}
                  
                </div>
              </div>

              {/* ── صفحتك العامة ── */}
              <div>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-[11px] text-[var(--d-text-muted)] uppercase tracking-wider font-medium">صفحتك العامة</span>
                  <div className="flex-1 h-px bg-[var(--d-border)]/50" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {/* Preview */}
                  <a
                    href={`/places/${place.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4 pr-5 text-right hover:bg-[var(--d-subtle-bg)] transition-colors block"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--d-purple-bg)] flex items-center justify-center mb-2.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    <p className="text-[14px] font-medium text-[var(--d-text)] mb-0.5">معاينة الصفحة</p>
                    <p className="text-[12px] text-[var(--d-text-sec)] leading-relaxed">{place.section === "food" ? "شاهد المنيو كما يراه الزبائن" : "شاهد محلك كما يراه الزبائن"}</p>
                  </a>
                  {/* Copy link */}
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/places/${place.id}`); showToast("تم نسخ الرابط ✓"); }}
                    className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4 pr-5 text-right hover:bg-[var(--d-subtle-bg)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--d-blue-bg)] flex items-center justify-center mb-2.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--d-blue-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </div>
                    <p className="text-[14px] font-medium text-[var(--d-text)] mb-0.5">نسخ الرابط</p>
                    <p className="text-[12px] text-[var(--d-text-sec)] leading-relaxed">{place.section === "food" ? "انسخ رابط المنيو وأرسله للزبائن" : "انسخ رابط محلك وأرسله للزبائن"}</p>
                  </button>
                  {/* WhatsApp share */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`تفضل رابط محلنا: ${typeof window !== "undefined" ? window.location.origin : ""}/places/${place.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4 pr-5 text-right hover:bg-[var(--d-subtle-bg)] transition-colors block"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--d-mint-bg)] flex items-center justify-center mb-2.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <p className="text-[14px] font-medium text-[var(--d-text)] mb-0.5">شارك عبر واتساب</p>
                    <p className="text-[12px] text-[var(--d-text-sec)] leading-relaxed">أرسل الرابط مباشرة للزبائن</p>
                  </a>
                  {/* QR Code download */}
                  {(place.plan === "basic" || place.plan === "premium") ? (
                    <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4 pr-5 text-right">
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[var(--d-green-bg)] flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--d-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><rect x="18" y="18" width="4" height="4" rx="0.5"/></svg>
                        </div>
                        <button
                          onClick={() => {
                            const svg = document.getElementById("place-qr-hero");
                            if (!svg) return;
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement("canvas");
                            canvas.width = 512; canvas.height = 512;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;
                            const img = new Image();
                            img.onload = () => { ctx.fillStyle = "white"; ctx.fillRect(0, 0, 512, 512); ctx.drawImage(img, 0, 0, 512, 512); const a = document.createElement("a"); a.download = `qr-${place.name}.png`; a.href = canvas.toDataURL("image/png"); a.click(); };
                            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                          }}
                          className="w-8 h-8 rounded-lg bg-[var(--d-green)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                          title="تحميل QR"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                      </div>
                      <p className="text-[14px] font-medium text-[var(--d-text)] mb-0.5">كود QR</p>
                      <p className="text-[12px] text-[var(--d-text-sec)] leading-relaxed">{place.section === "food" ? "حمّله واطبعه على طاولات المطعم" : "حمّله واطبعه وضعه في محلك"}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveView("plans")}
                      className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl p-4 pr-5 text-right hover:bg-[var(--d-subtle-bg)] transition-colors relative"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--d-amber-bg)] flex items-center justify-center mb-2.5">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--d-warn-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><rect x="18" y="18" width="4" height="4" rx="0.5"/></svg>
                      </div>
                      <p className="text-[14px] font-medium text-[var(--d-text)] mb-0.5">كود QR</p>
                      <p className="text-[12px] text-[var(--d-text-sec)] leading-relaxed">متاح في باقة Basic وBest</p>
                    </button>
                  )}
                </div>
              </div>

              {/* ── ميزات بانتظارك — desktop ── */}
              {(() => {
                const isPremium = place.plan === "premium";
                const features = place.plan === "free" ? [
                  { name: "الطلبات", desc: "تتبع كل طلب", icon: <><circle cx="9" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></> },
                  { name: "أكواد الخصم", desc: "اجذب الزبائن", icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="var(--d-purple-text)"/></> },
                  { name: "شارة التوثيق", desc: "زيد الثقة", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></> },
                  { name: "منيو + QR", desc: "شارك المنيو", icon: <><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><rect x="18" y="18" width="4" height="4" rx="0.5"/></> },
                ] : place.plan === "basic" ? [
                  { name: "في قسم الأبرز", desc: "ظهور مميز", icon: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></> },
                  { name: "فيديو إعلان AI", desc: "إعلان احترافي", icon: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></> },
                  { name: "نشر إعلان", desc: "على صفحاتنا", icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
                  { name: "ترويج الأكواد", desc: "على الموقع", icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></> },
                ] : [
                  { name: "الطلبات", desc: "تتبع كل طلب", icon: <><circle cx="9" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></> },
                  { name: "أكواد الخصم", desc: "اجذب الزبائن", icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="var(--d-purple-text)"/></> },
                  { name: "في قسم الأبرز", desc: "ظهور مميز", icon: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></> },
                  { name: "فيديو إعلان AI", desc: "إعلان احترافي", icon: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></> },
                ];
                const title = isPremium ? "ميزات باقتك" : "ميزات بانتظارك";
                const sub = place.plan === "free" ? "طوّر محلك بميزات احترافية" : isPremium ? "أنت تستمتع بجميع المزايا" : "احصل على ميزات حصرية";
                const accent = "var(--d-purple-text)";
                const gradient = isDark ? "from-[#1E1D30] via-[#252040] to-[#2A1D2E]" : "from-[#EEEDFE] via-[#CECBF6] to-[#FBEAF0]";
                return (
                  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-bl ${gradient} p-5`}>
                    <div className="absolute -top-[30px] -left-[30px] w-[120px] h-[120px] rounded-full bg-white/30" />
                    <div className="relative flex justify-between items-center mb-3.5">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {isPremium ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          )}
                          <p className="text-[14px] font-medium" style={{ color: "var(--d-purple-deep)" }}>{title}</p>
                        </div>
                        <p className="text-[12px]" style={{ color: "var(--d-purple-text)" }}>{sub}</p>
                      </div>
                      {!isPremium && <button onClick={() => setActiveView("plans")} className="text-[12px] px-3.5 py-[6px] bg-[var(--d-purple-text)] text-white rounded-lg font-medium hover:bg-[#443DA0] transition-colors">عرض الباقات ←</button>}
                    </div>
                    <div className="relative grid grid-cols-4 gap-2.5">
                      {features.map((f) => (
                        <div key={f.name} className="bg-[var(--d-card)]/70 rounded-xl p-2.5 text-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--d-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1">{f.icon}</svg>
                          <p className="text-[12px] font-medium mb-0.5" style={{ color: "var(--d-purple-deep)" }}>{f.name}</p>
                          <p className="text-[10px]" style={{ color: "var(--d-purple-text)" }}>{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
          })()}

          {/* Menu management — inline on desktop */}
          {activeView === "menu" && !isWorkspace && (
            <div className="space-y-3">
              {/* Page header */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[18px] text-[var(--d-text)]">إدارة القائمة</h3>
                <button onClick={() => setSheet("addSection")} className="text-[13px] font-medium px-3.5 py-[7px] rounded-lg bg-[var(--d-green)] text-white hover:opacity-90 transition-opacity">+ إضافة قسم</button>
              </div>

              {/* Section cards */}
              {(() => {
                const allItemsRaw = place.menu.flatMap((sec) => sec.items.map((item) => ({ ...item, sectionName: sec.name, sectionId: sec.id })));
                const filteredItems = dashSearch.trim()
                  ? allItemsRaw.filter((item) => item.name.toLowerCase().includes(dashSearch.trim().toLowerCase()) || item.sectionName.toLowerCase().includes(dashSearch.trim().toLowerCase()))
                  : allItemsRaw;

                // Group by section
                const sectionGroups = place.menu.map((sec) => ({
                  ...sec,
                  filteredItems: filteredItems.filter(item => item.sectionId === sec.id),
                })).filter(s => !dashSearch.trim() || s.filteredItems.length > 0);

                return sectionGroups.map((sec) => {
                  const isCollapsed = collapsedSections.has(sec.id);
                  return (
                  <div key={sec.id} className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl">
                    {/* Section header */}
                    <div className="px-4 py-3 flex items-center justify-between hover:bg-[var(--d-subtle-bg)]/50 transition-colors">
                      <button onClick={() => toggleSection(sec.id)} className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-[var(--d-text)]">{sec.name}</span>
                        <span className="text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-md bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)]">{sec.items.length}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--d-text-muted)] transition-transform ${isCollapsed ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setAddItemSection(sec.id); setSheet("addItem"); }} className="text-[12px] font-medium text-[var(--d-green)] border border-[var(--d-green)]/40 rounded-lg px-3 py-1.5 hover:bg-[var(--d-green-bg)] transition-colors">+ إضافة صنف</button>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setSectionMenuOpen(sectionMenuOpen === sec.id ? null : sec.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors">
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                          </button>
                          {sectionMenuOpen === sec.id && (
                            <>
                              <div className="fixed inset-0 z-[98]" onClick={() => setSectionMenuOpen(null)} />
                              <div className="absolute left-0 top-full mt-1 z-[99] w-36 bg-[var(--d-card)] border border-[var(--d-border)] rounded-lg shadow-xl overflow-hidden">
                                <button onClick={() => { setSectionMenuOpen(null); setEditSectionId(sec.id); setEditSectionName(sec.name); setSheet("editSection"); }} className="w-full text-right px-3 py-2.5 text-[12px] font-medium text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors flex items-center gap-2">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  تعديل الاسم
                                </button>
                                <button onClick={() => { setSectionMenuOpen(null); handleDeleteSection(sec.id); }} disabled={!!actionLoading} className="w-full text-right px-3 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                                  حذف القسم
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <>
                        {/* Items */}
                        {sec.filteredItems.map((item) => {
                          const isItemLoading = actionLoading === `toggle-item-${item.id}` || actionLoading === `delete-item-${item.id}`;
                          return (
                            <div
                              key={item.id}
                              className={`grid items-center gap-2.5 px-4 py-2.5 border-t border-[var(--d-border)]/50 hover:bg-[var(--d-subtle-bg)]/50 transition-colors ${isItemLoading ? "pointer-events-none opacity-50" : ""}`}
                              style={{ gridTemplateColumns: "44px 1fr 70px 30px 28px" }}
                            >
                              {/* Thumbnail */}
                              {resolvePublicImageUrl(item.photo_url) ? (
                                <img src={resolvePublicImageUrl(item.photo_url)!} alt="" className="w-11 h-11 rounded-lg object-cover" />
                              ) : (
                                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--d-icon-color)]" style={{ backgroundColor: getItemBgColor(sec.name) }}>
                                  {getItemIcon(sec.name)('w-6 h-6')}
                                </div>
                              )}

                              {/* Name + description */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-medium text-[var(--d-text)] truncate">{item.name}</p>
                                  {!item.available && <span className="text-[10px] font-medium px-[7px] py-px rounded-full bg-[var(--d-gray-alt-bg)] text-[var(--d-gray-alt-text)] shrink-0">غير متوفر</span>}
                                </div>
                                {item.description && <p className="text-[11px] text-[var(--d-text-muted)] truncate mt-0.5">{item.description}</p>}
                              </div>

                              {/* Price */}
                              <p className="text-[13px] font-medium text-[var(--d-text)] tabular-nums text-left" dir="ltr">
                                {Number(item.price) > 0 ? `₪${Number(item.price).toFixed(2)}` : "—"}
                              </p>

                              {/* Toggle */}
                              <button
                                onClick={() => handleToggleItem(item.id)}
                                disabled={!!actionLoading}
                                className={`relative w-[30px] h-[17px] rounded-full transition-colors shrink-0 ${item.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}
                              >
                                <span className={`absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white shadow transition-all ${item.available ? "left-[2px]" : "left-[15px]"}`} />
                              </button>

                              {/* Vertical menu */}
                              <div className="relative">
                                <button
                                  onClick={() => setMenuDropdown(menuDropdown === item.id ? null : item.id)}
                                  className="w-7 h-7 inline-flex flex-col items-center justify-center gap-[3px] rounded-md text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] border border-transparent hover:border-[var(--d-border)]/50 transition-colors"
                                >
                                  <span className="w-[3px] h-[3px] rounded-full bg-current" /><span className="w-[3px] h-[3px] rounded-full bg-current" /><span className="w-[3px] h-[3px] rounded-full bg-current" />
                                </button>
                                {menuDropdown === item.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuDropdown(null)} />
                                    <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl shadow-lg py-1 min-w-[140px]">
                                      <button onClick={() => { openEditItem(item); setMenuDropdown(null); }} disabled={!!actionLoading} className="w-full flex items-center gap-2 px-3.5 py-2 text-[12px] text-[var(--d-green)] hover:bg-[var(--d-green-bg)] transition-colors text-right">
                                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z" /></svg>
                                        تعديل
                                      </button>
                                      <div className="border-t border-[var(--d-border)] my-1" />
                                      <button onClick={() => { handleDeleteItem(item.id); setMenuDropdown(null); }} disabled={!!actionLoading} className="w-full flex items-center gap-2 px-3.5 py-2 text-[12px] text-red-500 hover:bg-red-50 transition-colors text-right">
                                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" /></svg>
                                        حذف
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                  );
                });
              })()}

              {/* Helper note */}
            </div>
          )}

          {activeView === "orders" && place.section === "food" && token && (
            <div>
              {place.plan === "free" ? (
                <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-5 shadow-sm">
                  <UpgradeCTA feature="orders" onUpgrade={() => setActiveView("plans")} onCompare={() => setActiveView("plans")} />
                </div>
              ) : (
                <DashboardOrders token={token} ordersEnabled={place.orders_enabled ?? false} onToggleOrders={handleToggleOrders} lastEvent={lastOrderEvent} search={dashSearch} />
              )}
            </div>
          )}

          {activeView === "discounts" && place.section === "food" && token && (
            <div className="h-[calc(100vh-140px)] flex flex-col">
              {place.plan === "free" ? (
                <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-5 shadow-sm">
                  <UpgradeCTA feature="discounts" onUpgrade={() => setActiveView("plans")} onCompare={() => setActiveView("plans")} />
                </div>
              ) : (
                <DashboardDiscountCodes
                  token={token}
                  ref={dcCodesRef}
                  search={dashSearch}
                  onAddCode={() => { resetDcForm(); setSheet("addDiscount"); }}
                  onEditCode={(dc) => {
                    setDcCode(dc.code); setDcType(dc.discount_type);
                    setDcValue(String(dc.discount_value));
                    setDcMinOrder(dc.min_order_total > 0 ? String(dc.min_order_total) : "");
                    setDcMaxUses(dc.max_uses ? String(dc.max_uses) : "");
                    setDcExpires(dc.expires_at ? dc.expires_at.slice(0, 10) : "");
                    setDcEditId(dc.id); setSheet("addDiscount");
                  }}
                />
              )}
            </div>
          )}

          {/* ══ PLANS PAGE ══ */}
          {activeView === "plans" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <button onClick={() => setActiveView("home")} className="lg:hidden w-[30px] h-[30px] inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <div>
                  <h2 className="text-[18px] font-medium text-[var(--d-text)]">الباقات</h2>
                  <p className="text-[12px] text-[var(--d-text-muted)] mt-0.5">اختر الباقة المناسبة لمحلك</p>
                </div>
              </div>

              {/* Current plan badge */}
              <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--d-green-bg)] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--d-green)]" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--d-text-muted)]">باقتك الحالية</p>
                    <p className="text-[15px] font-bold text-[var(--d-text)]">{planLabels[place.plan] ?? place.plan}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold py-1.5 px-3 rounded-full ${PLANS.find(p => p.key === place.plan)?.badgeClass ?? "bg-[var(--d-subtle-bg)] text-[var(--d-text-sec)]"}`}>
                  {place.plan === "free" ? "مجاني" : "مفعّل"}
                </span>
              </div>

              {/* Plan cards grid */}
              <div className="grid grid-cols-3 gap-4 items-stretch">
                {PLANS.map((p) => {
                  const isCurrent = place.plan === p.key;
                  const isSelected = selectedPlan === p.key;
                  const isPaid = p.key !== "free";
                  const feats = PLAN_FEATURES[p.key];
                  const isDisabled = p.key === "free" && place.plan !== "free";
                  return (
                    <div key={p.key} className={`rounded-2xl p-5 flex flex-col relative transition-all ${
                      isDisabled
                        ? "bg-[var(--d-card)] border border-[var(--d-border)]/50"
                        : `bg-[var(--d-card)] ${p.featured ? "border-2 border-[var(--d-green)]" : "border border-[var(--d-border)]/50"}`
                    }`}>
                      {p.featured && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[var(--d-green)] text-white text-[10.5px] font-medium px-3 py-1 rounded-full whitespace-nowrap">الأكثر اختياراً</div>
                      )}

                      {/* Header */}
                      <div className="mb-4">
                        <p className={`text-[11px] tracking-[0.5px] mb-1.5 ${p.featured ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>{p.tier}</p>
                        <h3 className="text-[17px] font-medium text-[var(--d-text)] mb-1">{p.badge}</h3>
                        <p className="text-[11.5px] text-[var(--d-text-sec)]">{p.sub}</p>
                      </div>

                      {/* Price */}
                      <div className="mb-4 pb-4 border-b border-[var(--d-border)]/50">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-[32px] font-medium leading-none ${p.featured ? "text-[var(--d-green)]" : "text-[var(--d-text)]"}`}>{p.price}</span>
                          <span className="text-[14px] text-[var(--d-text-sec)]">₪{p.price !== "0" ? " / شهر" : ""}</span>
                        </div>
                      </div>

                      {/* Features list */}
                      <ul className="space-y-0 mb-4 flex-1">
                        {feats.has.map((feat) => (
                          <li key={feat} className="flex items-center gap-2 py-[5px] text-[12.5px] text-[var(--d-text-sec)]">
                            <CheckIcon />
                            <span>{feat}</span>
                          </li>
                        ))}
                        {feats.missing.map((feat) => (
                          <li key={feat} className="flex items-center gap-2 py-[5px] text-[12.5px] text-[var(--d-text-muted)]">
                            <XIcon />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Premium exclusives box */}
                      {p.key === "premium" && (
                        <div className="bg-[var(--d-mint-bg)] rounded-xl p-3 mb-4">
                          <p className="text-[10.5px] font-medium text-[var(--d-mint-text)] mb-2 tracking-[0.3px]">★ مزايا حصرية</p>
                          <ul className="space-y-0">
                            {PREMIUM_EXCLUSIVES.map((feat) => (
                              <li key={feat} className="flex items-start gap-2 py-1 text-[12px] text-[var(--d-mint-text)]">
                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--d-mint-text)]">
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* CTA button */}
                      {isDisabled ? (
                        <div className="w-full py-2.5 rounded-xl text-[12.5px] font-medium text-center text-[var(--d-text-muted)] bg-[var(--d-border)]/30 cursor-not-allowed">
                          غير متاح
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedPlan(isSelected ? null : p.key)}
                          className={`w-full py-2.5 rounded-xl text-[12.5px] font-medium transition-all ${
                            isCurrent
                              ? "bg-transparent text-[var(--d-mint-text)] border border-[#9FE1CB]"
                              : isSelected
                                ? "bg-[var(--d-green)] text-white"
                                : p.featured
                                  ? "bg-[var(--d-green)] text-white"
                                  : "bg-[var(--d-card)] text-[var(--d-mint-text)] border border-[var(--d-mint-text)]"
                          }`}
                        >
                          {isCurrent ? (<><svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="inline-block align-[-1px] ml-1"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>باقتك الحالية</>) : isSelected ? "تم الاختيار ✓" : `ترقية إلى ${p.badge}`}
                        </button>
                      )}

                      {/* Payment inside card */}
                      {isPaid && isSelected && !isCurrent && (
                        <div className="mt-4 pt-4 border-t border-[var(--d-green)]/40 text-right">
                          <div className="bg-[var(--d-subtle-bg)] rounded-xl p-3 mb-2">
                            <div className="text-[11px] text-[var(--d-text-muted)] font-semibold mb-1.5">١. حوّل المبلغ عبر بنك فلسطين</div>
                            <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl px-3 py-2.5 flex items-center justify-between">
                              <span className="text-[15px] font-bold text-[var(--d-text)] tracking-wider" dir="ltr">0567359920</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("0567359920"); }}
                                className="text-[10px] text-[var(--d-green)] font-bold bg-[var(--d-green-bg)] rounded-lg px-2.5 py-1"
                              >
                                نسخ
                              </button>
                            </div>
                          </div>
                          <div className="bg-[var(--d-subtle-bg)] rounded-xl p-3">
                            <div className="text-[11px] text-[var(--d-text-muted)] font-semibold mb-1.5">٢. أرسل إشعار التحويل للتأكيد</div>
                            <a
                              href={`https://wa.me/972567359920?text=${encodeURIComponent(`مرحباً، حوّلت ${p.price} شيكل لباقة ${p.badge} — الاسم: ${place.name}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-[#25D366] text-white font-bold text-[13px] rounded-xl py-2.5 flex items-center justify-center gap-2"
                            >
                              <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.39 0-4.598-.788-6.379-2.117l-.446-.338-2.634.883.883-2.634-.338-.446A9.723 9.723 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z" />
                              </svg>
                              إرسال عبر واتساب
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ PROFILE PAGE ══ */}
          {activeView === "edit" && (
            <div className="space-y-3.5">
              {/* Page header */}
              <div className="flex items-center gap-2.5">
                <button onClick={() => setActiveView("home")} className="lg:hidden w-[30px] h-[30px] inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <div>
                  <h2 className="text-[18px] font-medium text-[var(--d-text)]">{`بيانات ${placeLabel(place.type, place.section)}`}</h2>
                  <p className="text-[12px] text-[var(--d-text-muted)] mt-0.5">المعلومات التي يراها الزبائن في صفحتك العامة</p>
                </div>
              </div>

              {/* Hero card — green banner with avatar, name, status, edit, share, link */}
              <div className="rounded-2xl overflow-hidden">
                <div className="bg-[var(--d-green)] px-5 pt-5 pb-6 relative overflow-hidden">
                  <div className="absolute w-[200px] h-[200px] rounded-full bg-white/5 -bottom-16 -left-10" />
                  <div className="absolute w-[100px] h-[100px] rounded-full bg-white/5 top-2 right-[30%]" />

                  <div className="flex items-center justify-between relative z-[1]">
                    {/* Right (in RTL): avatar + name + status */}
                    <div className="flex items-center gap-3">
                      <div className="w-[70px] h-[70px] rounded-full border-[3px] border-white/30 bg-white flex items-center justify-center text-[var(--d-green)] text-[26px] font-bold shrink-0 overflow-hidden shadow-lg">
                        {place.avatar_url ? (
                          <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : place.name.charAt(0)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className={`self-start text-[9px] font-medium px-1.5 py-[2px] rounded-full ${place.is_open ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}>
                          {place.is_open ? "مفتوح" : "مغلق"}
                        </span>
                        <h2 className="text-[18px] font-bold text-white">{place.name}</h2>
                        <p className="text-[12px] text-white/60">{place.type || (place.section === "food" ? "مطعم" : "متجر")}{place.area ? ` · ${place.area.name_ar}` : ""}</p>
                      </div>
                    </div>

                    {/* Left (in RTL): edit + share + link */}
                    <div className="flex flex-col items-start gap-2">
                      <button onClick={() => { populateEditForm(); setSheet("edit"); }} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        تعديل
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(`https://gazaprice.com/${place.name}`); showToast("تم نسخ الرابط ✓"); }} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/70 hover:text-white transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        مشاركة الرابط
                      </button>
                      <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                        <code className="text-[11px] text-white/80 font-mono" dir="ltr">gazaprice.com/{place.name}</code>
                        <button onClick={() => { navigator.clipboard.writeText(`https://gazaprice.com/${place.name}`); showToast("تم نسخ الرابط ✓"); }} className="text-white/50 hover:text-white transition-colors">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact info section */}
              <div className="bg-[var(--d-card)] border border-[var(--d-border)]/50 rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-2">
                  <h3 className="text-[15px] font-bold text-[var(--d-text)]">معلومات التواصل</h3>
                </div>
                <div className="px-5 pb-2">
                  {/* Phone */}
                  {place.phone && (
                    <div className="flex items-center justify-between py-3.5 border-b border-[var(--d-border)]/50">
                      <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--d-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                        <span className="text-[13px] font-medium text-[var(--d-text)]">رقم الهاتف</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[var(--d-text)] tabular-nums" dir="ltr">{place.phone}</span>
                        <button onClick={() => navigator.clipboard.writeText(place.phone || '')} className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-green)] hover:bg-[var(--d-green-bg)] transition-colors" title="نسخ">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {/* WhatsApp */}
                  {place.whatsapp && (
                    <div className="flex items-center justify-between py-3.5 border-b border-[var(--d-border)]/50">
                      <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.39 0-4.598-.788-6.379-2.117l-.446-.338-2.634.883.883-2.634-.338-.446A9.723 9.723 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg>
                        <span className="text-[13px] font-medium text-[var(--d-text)]">رقم الواتساب</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[var(--d-text)] tabular-nums" dir="ltr">{place.whatsapp}</span>
                        <button onClick={() => window.open(`https://wa.me/${place.whatsapp?.replace(/\D/g, '')}`, '_blank')} className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-green)] hover:bg-[var(--d-green-bg)] transition-colors" title="فتح">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Address */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-[13px] font-medium text-[var(--d-text)]">العنوان</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--d-text)] text-left max-w-[280px] truncate" dir="ltr">{place.area?.name_ar || "—"}{place.address ? ` - ${place.address}` : ""}</span>
                      <button onClick={() => navigator.clipboard.writeText(`${place.area?.name_ar || ''} ${place.address || ''}`)} className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-green)] hover:bg-[var(--d-green-bg)] transition-colors shrink-0" title="نسخ">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ══ Bottom Nav (mobile) / Sidebar (desktop) ══ */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--d-card)] border-t border-[var(--d-border)] flex items-center px-1 pb-2 z-10 lg:hidden">
        <NavItem icon="home" label="الرئيسية" active={mobileTab === "home"} onClick={() => { setMobileTab("home"); setDashSearch(""); }} />
        {isWorkspace ? (
          <>
            <NavItem icon="menu" label="الأسعار" active={false} onClick={openWsDetails} />
            <NavItem icon="add" label="الخدمات" active={false} onClick={openWsServices} />
          </>
        ) : (
          <>
            <NavItem icon="orders" label="الطلبات" active={mobileTab === "orders"} onClick={() => { setMobileTab("orders"); setDashSearch(""); }} />
            <NavItem icon="menu" label="القائمة" active={mobileTab === "menu"} onClick={() => { setMobileTab("menu"); setDashSearch(""); }} />
            <NavItem icon="tag" label="الأكواد" active={mobileTab === "codes"} onClick={() => { setMobileTab("codes"); setDashSearch(""); }} />
          </>
        )}
        <NavItem icon="user" label="بروفايل" active={mobileTab === "settings"} onClick={() => { setMobileTab("settings"); setDashSearch(""); populateEditForm(); }} />
      </div>

      {/* ══ SHEETS ══ */}

      {/* Menu Sheet */}
      <SheetWrap open={sheet === "menu"} onClose={() => setSheet(null)} title="إدارة القائمة" sub={`${totalItems} صنف في ${place.menu.length} أقسام`}>
        <div className="space-y-5">
          {place.menu.map((sec) => {
            const isSectionLoading = actionLoading === `delete-section-${sec.id}`;
            return (
            <div key={sec.id} className={`relative ${isSectionLoading ? "pointer-events-none opacity-50" : ""}`}>
              {isSectionLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-5 h-5 border-2 border-[var(--d-warn-text)]/30 border-t-[var(--d-warn-text)] rounded-full animate-spin" />
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--d-border)] mb-2">
                <span className="font-bold text-[13px] text-[var(--d-text)]">{sec.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setAddItemSection(sec.id); setSheet("addItem"); }}
                    className="text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-full px-2.5 py-1"
                  >
                    + صنف
                  </button>
                  <div className="relative">
                    <button onClick={() => setSectionMenuOpen(sectionMenuOpen === sec.id ? null : sec.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                    {sectionMenuOpen === sec.id && (
                      <>
                        <div className="fixed inset-0 z-[98]" onClick={() => setSectionMenuOpen(null)} />
                        <div className="absolute left-0 top-full mt-1 z-[99] w-36 bg-[var(--d-card)] border border-[var(--d-border)] rounded-lg shadow-xl overflow-hidden">
                          <button onClick={() => { setSectionMenuOpen(null); setEditSectionId(sec.id); setEditSectionName(sec.name); setSheet("editSection"); }} className="w-full text-right px-3 py-2.5 text-[12px] font-medium text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            تعديل الاسم
                          </button>
                          <button onClick={() => { setSectionMenuOpen(null); handleDeleteSection(sec.id); }} disabled={!!actionLoading} className="w-full text-right px-3 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                            حذف القسم
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {sec.items.map((item) => {
                const isItemLoading = actionLoading === `toggle-item-${item.id}` || actionLoading === `delete-item-${item.id}`;
                return (
                <div key={item.id} className={`bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3 mb-1.5 relative ${!item.available ? "opacity-55" : ""} ${isItemLoading ? "pointer-events-none" : ""}`}>
                  {isItemLoading && (
                    <div className="absolute inset-0 bg-[var(--d-card)]/70 rounded-2xl flex items-center justify-center z-10">
                      <div className="w-5 h-5 border-2 border-[var(--d-green)]/30 border-t-[var(--d-green)] rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--d-text)]">{item.name}</div>
                      {item.description && <div className="text-[10px] text-[var(--d-text-muted)] mt-0.5">{item.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${Number(item.price) > 0 ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>
                        {Number(item.price) > 0 ? `${item.price} ₪` : "—"}
                      </span>
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        disabled={!!actionLoading}
                        className={`w-9 h-5 rounded-full relative transition-colors ${item.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}
                      >
                        {actionLoading === `toggle-item-${item.id}` ? (
                          <div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 border-[1.5px] border-white/50 border-t-white rounded-full animate-spin" /></div>
                        ) : (
                          <div className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${item.available ? "right-[19px]" : "right-[3px]"}`} />
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Edit / Delete row */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--d-border)]">
                    <button
                      onClick={() => openEditItem(item)}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-lg py-1.5"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z" />
                      </svg>
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--d-warn-text)] bg-[var(--d-red-bg)] rounded-lg py-1.5 px-3"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" />
                      </svg>
                      حذف
                    </button>
                  </div>
                </div>
                );
              })}
              {sec.items.length === 0 && (
                <div className="text-center text-[11px] text-[var(--d-text-muted)] py-4">لا توجد أصناف في هذا القسم</div>
              )}
            </div>
          ); })}
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { setAddItemSection(place.menu[0]?.id ?? ""); setSheet("addItem"); }}
            className="flex-1 bg-[var(--d-green)] text-white font-bold text-[13px] rounded-full py-3 flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--d-green)]/20"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>
            إضافة صنف
          </button>
          <button
            onClick={() => setSheet("addSection")}
            className="bg-[var(--d-green-bg)] text-[var(--d-green)] font-bold text-[13px] rounded-full py-3 px-5"
          >
            + قسم
          </button>
        </div>
      </SheetWrap>

      {/* Edit Sheet */}
      <SheetWrap open={sheet === "edit"} onClose={() => setSheet(null)} title={`بروفايل ${placeLabel(place.type, place.section)}`} sub="التغييرات تظهر فوراً للزوار">
        <div className="space-y-3.5">
          {/* Avatar upload */}
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">{`صورة ${placeLabel(place.type, place.section)}`}</label>
            <div className="flex items-center gap-3">
              <div className="w-[56px] h-[56px] rounded-full bg-[var(--d-subtle-bg)] border-2 border-dashed border-[var(--d-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {place.avatar_url ? (
                  <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--d-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="text-center py-2.5 rounded-xl border-[1.5px] border-[var(--d-border)] text-[12px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] hover:bg-[var(--d-green-bg-hover)] transition-colors">
                  {saving ? "جاري الرفع..." : "رفع صورة"}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || saving) return;
                    setSaving(true);
                    try {
                      const compressed = await compressImageForUpload(file);
                      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
                      const fd = new FormData();
                      fd.append("file", compressed);
                      const up = await fetch(`${base}/upload/avatar`, { method: "POST", body: fd });
                      const upData = await up.json();
                      if (upData.url) {
                        await apiFetch(`/api/places/dashboard/update?${qs}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ avatar_url: upData.url }),
                        });
                        await load();
                        showToast("تم تحديث الصورة ✓");
                      }
                    } catch { /* ignore */ } finally { setSaving(false); }
                  }}
                />
              </label>
            </div>
          </div>
          <FormField label={`اسم ${placeLabel(place.type, place.section)}`} value={editName} onChange={setEditName} />
          {place.section === "store" && (
            <div>
              <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">
                نوع المتجر <span className="text-[var(--d-warn-text)] text-[11px]">*</span>
              </label>
              <select
                value={editStoreType}
                onChange={(e) => setEditStoreType(e.target.value)}
                className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]"
              >
                <option value="">اختر نوع المتجر...</option>
                {STORE_CATEGORIES.map((cat) => (
                  <optgroup key={cat.label} label={`${cat.icon} ${cat.label}`}>
                    {cat.types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">المنطقة</label>
            <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]">
              <option value="">اختر المنطقة...</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>
          </div>
          <FormField label="العنوان التفصيلي" value={editAddress} onChange={setEditAddress} textarea />
          <FormField label="رقم الهاتف" value={editPhone} onChange={setEditPhone} type="tel" />
          <FormField label="واتساب" value={editWhatsapp} onChange={setEditWhatsapp} type="tel" />
          <button
            onClick={handleSaveEdit}
            disabled={saving || (place.section === "store" && !STORE_TYPE_VALUES.includes(editStoreType))}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </SheetWrap>

      {/* Add Item Sheet */}
      <SheetWrap open={sheet === "addItem"} onClose={() => setSheet(null)} title="إضافة صنف جديد" sub="أضف صنف لقائمتك">
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">القسم</label>
            <select value={addItemSection} onChange={(e) => setAddItemSection(e.target.value)} className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]">
              {place.menu.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <FormField label="اسم الصنف" value={addItemName} onChange={setAddItemName} placeholder={itemNamePlaceholder} />
          <FormField label="السعر (₪)" value={addItemPrice} onChange={setAddItemPrice} type="number" placeholder="0" />
          <FormField label="وصف (اختياري)" value={addItemDesc} onChange={setAddItemDesc} placeholder="وصف قصير..." />
          {/* Photo upload */}
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">صورة المنتج (اختياري)</label>
            {addItemPhoto ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--d-border)]">
                <img
                  src={addItemPhotoPreview || normalizeImageUrl(addItemPhoto)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => showToast("تعذر عرض الصورة. جرّب صورة أخرى")}
                />
                <button onClick={() => { setAddItemPhoto(""); setAddItemPhotoPreview(""); }} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[var(--d-border)] rounded-xl py-5 cursor-pointer hover:border-[var(--d-green)] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAddItemPhotoPreview(URL.createObjectURL(file));
                  const url = await uploadProductPhoto(file);
                  if (url) setAddItemPhoto(url);
                  else setAddItemPhotoPreview("");
                  e.target.value = "";
                }} />
                {uploadingPhoto ? (
                  <span className="text-xs text-[var(--d-text-muted)]">جاري الرفع...</span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--d-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span className="text-xs text-[var(--d-text-muted)]">اضغط لرفع صورة</span>
                  </>
                )}
              </label>
            )}
          </div>
          <button
            onClick={handleAddItem}
            disabled={saving || !addItemName.trim() || uploadingPhoto}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الإضافة..." : "إضافة الصنف"}
          </button>
        </div>
      </SheetWrap>

      {/* Add Section Sheet */}
      <SheetWrap open={sheet === "addSection"} onClose={() => setSheet(null)} title="إضافة قسم جديد" sub="أنشئ قسم جديد لقائمتك">
        <div className="space-y-3.5">
          <FormField label="اسم القسم" value={addSectionName} onChange={setAddSectionName} placeholder="مثال: فطور" />
          <button
            onClick={handleAddSection}
            disabled={saving || !addSectionName.trim()}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الإضافة..." : "إضافة القسم"}
          </button>
        </div>
      </SheetWrap>

      {/* Edit Section Sheet */}
      <SheetWrap open={sheet === "editSection"} onClose={() => { setSheet(null); setEditSectionId(null); }} title="تعديل اسم القسم" sub="غيّر اسم القسم">
        <div className="space-y-3.5">
          <FormField label="اسم القسم" value={editSectionName} onChange={setEditSectionName} placeholder="مثال: فطور" />
          <button
            onClick={handleRenameSection}
            disabled={saving || !editSectionName.trim()}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديل"}
          </button>
        </div>
      </SheetWrap>

      {/* Add/Edit Discount Code Sheet */}
      <SheetWrap open={sheet === "addDiscount"} onClose={() => { setSheet(null); resetDcForm(); }} title={dcEditId ? "تعديل كود الخصم" : "إضافة كود خصم"} sub={dcEditId ? "عدّل تفاصيل الكود" : "أنشئ كود خصم جديد لزبائنك"}>
        <div className="space-y-3.5">
          <FormField label="الكود" value={dcCode} onChange={(v) => setDcCode(v.toUpperCase())} placeholder="مثال: WELCOME10" />
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">نوع الخصم</label>
            <div className="flex gap-2">
              <button onClick={() => setDcType("percentage")} className={`flex-1 py-3 rounded-xl text-[13px] font-bold border ${dcType === "percentage" ? "bg-[var(--d-green)] text-white border-[var(--d-green)]" : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border-[var(--d-border)]"}`}>نسبة %</button>
              <button onClick={() => setDcType("fixed")} className={`flex-1 py-3 rounded-xl text-[13px] font-bold border ${dcType === "fixed" ? "bg-[var(--d-green)] text-white border-[var(--d-green)]" : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border-[var(--d-border)]"}`}>مبلغ ثابت ₪</button>
            </div>
          </div>
          <FormField label={dcType === "percentage" ? "القيمة (%)" : "المبلغ (₪)"} value={dcValue} onChange={setDcValue} type="number" placeholder="0" />
          <FormField label="حد أدنى للطلب (₪)" value={dcMinOrder} onChange={setDcMinOrder} type="number" placeholder="اختياري" />
          <FormField label="عدد الاستخدامات" value={dcMaxUses} onChange={setDcMaxUses} type="number" placeholder="بلا حد" />
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">تاريخ الانتهاء</label>
            <input value={dcExpires} onChange={(e) => setDcExpires(e.target.value)} type="date" className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none focus:border-[var(--d-green)]" dir="ltr" />
          </div>
          {dcFormError && <p className="text-[12px] text-red-500 font-medium text-center">{dcFormError}</p>}
          <button
            onClick={handleSaveDiscount}
            disabled={saving || !dcCode.trim() || !dcValue.trim()}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : dcEditId ? "تحديث الكود" : "إضافة الكود"}
          </button>
        </div>
      </SheetWrap>

      {/* Edit Item Sheet */}
      <SheetWrap open={sheet === "editItem"} onClose={() => setSheet(null)} title="تعديل الصنف" sub="عدّل الاسم أو السعر أو الوصف أو الصورة">
        <div className="space-y-3.5">
          <FormField label="اسم الصنف" value={editItemName} onChange={setEditItemName} />
          <FormField label="السعر (₪)" value={editItemPrice} onChange={setEditItemPrice} type="number" placeholder="0" />
          <FormField label="وصف (اختياري)" value={editItemDesc} onChange={setEditItemDesc} placeholder="وصف قصير..." />
          {/* Photo upload */}
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">صورة المنتج</label>
            {editItemPhoto ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--d-border)]">
                <img
                  src={editItemPhotoPreview || normalizeImageUrl(editItemPhoto)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => showToast("تعذر عرض الصورة. جرّب صورة أخرى")}
                />
                <button onClick={() => { setEditItemPhoto(""); setEditItemPhotoPreview(""); }} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[var(--d-border)] rounded-xl py-5 cursor-pointer hover:border-[var(--d-green)] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setEditItemPhotoPreview(URL.createObjectURL(file));
                  const url = await uploadProductPhoto(file);
                  if (url) setEditItemPhoto(url);
                  else setEditItemPhotoPreview("");
                  e.target.value = "";
                }} />
                {uploadingPhoto ? (
                  <span className="text-xs text-[var(--d-text-muted)]">جاري الرفع...</span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--d-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span className="text-xs text-[var(--d-text-muted)]">اضغط لرفع صورة</span>
                  </>
                )}
              </label>
            )}
          </div>
          <button
            onClick={handleUpdateItem}
            disabled={saving || !editItemName.trim() || uploadingPhoto}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </SheetWrap>

      {/* Workspace Details Sheet */}
      <SheetWrap open={sheet === "wsDetails"} onClose={() => setSheet(null)} title="الأسعار والأوقات" sub="عدّل أسعار المساحة ومواعيد العمل">
        {wsLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--d-green)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="space-y-3.5">
          <div className="text-[11px] font-bold text-[var(--d-text-sec)] mb-1">الأسعار (بالشيكل)</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="سعر الساعة" value={wsDetails.price_hour} onChange={(v) => setWsDetails(d => ({...d, price_hour: v}))} type="number" placeholder="0" />
            <FormField label="نصف يوم" value={wsDetails.price_half_day} onChange={(v) => setWsDetails(d => ({...d, price_half_day: v}))} type="number" placeholder="0" />
            <FormField label="يوم كامل" value={wsDetails.price_day} onChange={(v) => setWsDetails(d => ({...d, price_day: v}))} type="number" placeholder="0" />
            <FormField label="أسبوع" value={wsDetails.price_week} onChange={(v) => setWsDetails(d => ({...d, price_week: v}))} type="number" placeholder="0" />
          </div>
          <FormField label="سعر الشهر" value={wsDetails.price_month} onChange={(v) => setWsDetails(d => ({...d, price_month: v}))} type="number" placeholder="0" />

          <div className="h-px bg-[var(--d-toggle-off)] my-1" />
          <div className="text-[11px] font-bold text-[var(--d-text-sec)] mb-1">أوقات العمل</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="يفتح الساعة" value={wsDetails.opens_at} onChange={(v) => setWsDetails(d => ({...d, opens_at: v}))} type="time" />
            <FormField label="يغلق الساعة" value={wsDetails.closes_at} onChange={(v) => setWsDetails(d => ({...d, closes_at: v}))} type="time" />
          </div>

          <div className="h-px bg-[var(--d-toggle-off)] my-1" />
          <div className="text-[11px] font-bold text-[var(--d-text-sec)] mb-1">المقاعد</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="إجمالي المقاعد" value={wsDetails.total_seats} onChange={(v) => setWsDetails(d => ({...d, total_seats: v}))} type="number" placeholder="0" />
            <FormField label="المقاعد المتاحة" value={wsDetails.available_seats} onChange={(v) => setWsDetails(d => ({...d, available_seats: v}))} type="number" placeholder="0" />
          </div>

          <button onClick={handleSaveWsDetails} disabled={saving} className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2">
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
        )}
      </SheetWrap>

      {/* Workspace Services Sheet */}
      <SheetWrap open={sheet === "wsServices"} onClose={() => setSheet(null)} title="الخدمات المتاحة" sub="فعّل الخدمات المتوفرة في مساحتك">
        {wsLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--d-green)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="space-y-3">
          {wsServices.map((s, i) => (
            <div key={s.service} className={`bg-[var(--d-card)] border rounded-2xl p-4 transition-all ${s.available ? 'border-[var(--d-green)]/30 bg-[var(--d-card-hover)]' : 'border-[var(--d-border)]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[13px] text-[var(--d-text)]">{WS_SERVICE_LABELS[s.service] || s.service}</span>
                <button
                  onClick={() => setWsServices(prev => prev.map((ss, j) => j === i ? {...ss, available: !ss.available} : ss))}
                  className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${s.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}
                >
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${s.available ? "right-[25px]" : "right-[3px]"}`} />
                </button>
              </div>
              {s.available && (
                <input
                  value={s.detail}
                  onChange={(e) => setWsServices(prev => prev.map((ss, j) => j === i ? {...ss, detail: e.target.value} : ss))}
                  placeholder="تفاصيل إضافية (اختياري)..."
                  className="w-full border border-[var(--d-border)] rounded-xl px-3 py-2 text-[12px] text-[var(--d-text)] bg-[var(--d-input-bg)] outline-none focus:border-[var(--d-green)] placeholder:text-[var(--d-text-muted)]"
                />
              )}
            </div>
          ))}
          <button onClick={handleSaveWsServices} disabled={saving} className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2">
            {saving ? "جاري الحفظ..." : "حفظ الخدمات"}
          </button>
        </div>
        )}
      </SheetWrap>

      {/* Footer */}
      <div className="text-center pb-20 lg:pb-8 px-4 max-w-[1100px] mx-auto">
        <p className="text-[10px] lg:text-xs text-[var(--d-text-muted)]">غزة بريس 🌿 لوحة تحكم المالك</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white text-[13px] font-bold px-5 py-3 rounded-xl shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-5 w-full max-w-[280px] shadow-xl text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--d-red-bg)] flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="var(--d-warn-text)" strokeWidth={2} strokeLinecap="round">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              </svg>
            </div>
            <p className="text-[13px] font-bold text-[var(--d-text)] mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold border border-[var(--d-border)] text-[var(--d-text-muted)] bg-[var(--d-subtle-bg)]"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-[var(--d-warn-text)] text-white"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function ActionItem({ icon, iconBg, iconColor, title, sub, badge, onClick, last, active }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  title: string; sub: string; badge?: React.ReactNode;
  onClick?: () => void; last?: boolean; active?: boolean;
}) {
  return (
    <>
      <button onClick={onClick} className={`w-full flex items-center gap-3 px-3.5 py-3.5 text-right transition-colors hover:bg-[var(--d-green-bg-hover)] ${active ? "bg-[var(--d-green-bg)]" : ""}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${iconColor}`} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {(icon as React.ReactElement<{ children?: React.ReactNode }>).props.children}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--d-text)] mb-0.5">{title}</p>
          <p className="text-[12px] text-[var(--d-text-sec)] leading-snug">{sub}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {badge}
          <span className="text-[var(--d-text-muted)] text-sm">›</span>
        </div>
      </button>
      {!last && <div className="h-px bg-[var(--d-border)]/50" />}
    </>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    orders: <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M16 10a4 4 0 01-8 0"/></>,
    menu: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x={9} y={3} width={6} height={4} rx={2} /></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1={7} y1={7} x2={7.01} y2={7}/></>,
    add: <><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  };
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl transition-colors relative">
      {active && <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-10 h-7 bg-[var(--d-green-bg)] rounded-[9px] z-0" />}
      <svg viewBox="0 0 24 24" className={`w-[18px] h-[18px] relative z-[1] ${active ? "stroke-[var(--d-green)]" : "stroke-[var(--d-text-muted)]"}`} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {icons[icon]}
      </svg>
      <span className={`text-[9px] font-bold relative z-[1] ${active ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>{label}</span>
    </button>
  );
}

function SheetWrap({ open, onClose, title, sub, children }: {
  open: boolean; onClose: () => void; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop for desktop */}
      {open && <div className="hidden lg:block fixed inset-0 bg-black/20 z-[19]" onClick={onClose} />}
      <div className={`fixed inset-0 bg-[var(--d-page)] z-20 flex flex-col transition-transform duration-300 lg:inset-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-[460px] lg:max-w-[85vw] lg:transition-transform ${open ? "translate-y-0 lg:translate-y-0 lg:translate-x-0 lg:shadow-2xl" : "translate-y-full lg:translate-y-0 lg:translate-x-full"} ${open ? "" : "pointer-events-none invisible"}`} dir="rtl">
        <div className="bg-[var(--d-green)] px-4 pt-4 pb-5 flex-shrink-0 relative overflow-hidden lg:px-6 lg:pt-6 lg:pb-6">
          <div className="absolute w-[130px] h-[130px] rounded-full bg-white/5 -bottom-10 -left-4" />
          <div className="flex items-center gap-2 mb-1 relative z-[1]">
            <span className="font-bold text-sm lg:text-base text-white flex-1">{title}</span>
            <button onClick={onClose} className="w-[30px] h-[30px] bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
                <path d="M18 6L6 18" /><path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-[11px] lg:text-xs text-white/50">{sub}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 lg:px-6 lg:pb-8">
          {children}
        </div>
      </div>
    </>

  );
}

function FormField({ label, value, onChange, type = "text", placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full border border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--d-text)] outline-none transition-colors placeholder:text-[var(--d-border)] focus:border-[var(--d-green)]";
  return (
    <div>
      <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${cls} resize-none h-[72px]`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
