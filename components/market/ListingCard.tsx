"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/fetch";
import { useSession } from "@/hooks/useSession";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import type { Listing } from "@/lib/queries/fetchers";

const CATEGORY_CONFIG: Record<string, { bg: string; emoji: string }> = {
  electronics: { bg: "bg-blue-50",    emoji: "📱" },
  clothes:     { bg: "bg-pink-50",    emoji: "👕" },
  furniture:   { bg: "bg-amber-50",   emoji: "🪑" },
  food:        { bg: "bg-green-50",   emoji: "🥗" },
  books:       { bg: "bg-violet-50",  emoji: "📚" },
  tools:       { bg: "bg-slate-100",  emoji: "🔧" },
  toys:        { bg: "bg-yellow-50",  emoji: "🧸" },
  other:       { bg: "bg-olive-pale", emoji: "📦" },
};

const CONDITION_BADGE: Record<string, { label: string; cls: string }> = {
  new:    { label: "جديد",    cls: "bg-emerald-100 text-emerald-800" },
  used:   { label: "مستعمل", cls: "bg-amber-100 text-amber-800" },
  urgent: { label: "عاجل",   cls: "bg-red-100 text-red-700" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

interface ListingCardProps {
  listing: Listing;
  isSaved?: boolean;
  onSaveToggle?: (id: string, saved: boolean) => void;
}

export function ListingCard({ listing, isSaved = false, onSaveToggle }: ListingCardProps) {
  const router = useRouter();
  const { contributor, refreshContributor } = useSession();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  async function doSave() {
    const next = !saved;

    setSaving(true);
    setSaved(next);
    try {
      const res = await apiFetch(
        `/api/listings/${listing.id}/save`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
        onSaveToggle?.(listing.id, data.saved);
      } else {
        setSaved(!next);
      }
    } catch {
      setSaved(!next);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;

    if (!contributor || !contributor.phone_verified) {
      setShowLogin(true);
      return;
    }

    doSave();
  }
  const cat = CATEGORY_CONFIG[listing.category] ?? CATEGORY_CONFIG.other;
  const cond = CONDITION_BADGE[listing.condition] ?? CONDITION_BADGE.used;
  const firstImage = listing.images?.sort((a, b) => a.sort_order - b.sort_order)[0];

  const isSold = listing.status === "sold";
  const isDemo = !!listing.is_demo;

  return (
    <>
    <div
      onClick={() => router.push(`/market/${listing.id}`)}
      className={cn("bg-surface rounded-2xl shadow-sm border border-border/60 overflow-hidden transition-all hover:shadow-md cursor-pointer active:scale-[0.99] relative", isSold && "opacity-70")}
    >
      {/* Desktop: vertical layout (image top) */}
      <div className="hidden lg:block">
        <div className="p-2 pb-0">
          <div className={cn(
            "relative w-full rounded-xl overflow-hidden flex items-center justify-center aspect-[4/3]",
            !firstImage && cat.bg
          )}>
            {firstImage ? (
              <Image src={firstImage.url} alt={listing.title} fill className="object-cover" sizes="280px" />
            ) : (
              <span className="text-[36px] select-none">{cat.emoji}</span>
            )}
            {isSold && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[1]">
                <span className="bg-white/90 text-slate-700 text-[11px] font-bold px-3 py-1 rounded-full">تم البيع</span>
              </div>
            )}
            {isDemo && (
              <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-[9px] font-bold px-2 py-[3px] z-[2]" style={{ borderRadius: "0 0 10px 0" }}>
                تجريبي
              </div>
            )}
            <button onClick={handleSave} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center text-white transition-colors z-[2]" aria-label="حفظ">
              <svg viewBox="0 0 24 24" className={cn("w-[14px] h-[14px] transition-colors", saved ? "fill-white stroke-white" : "fill-none stroke-current")} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="px-3 py-2.5 min-w-0 flex flex-col gap-1.5">
          <div className="font-bold text-[13px] text-ink leading-snug line-clamp-2">{listing.title}</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] font-bold px-2 py-[2px] rounded-full", cond.cls)}>{cond.label}</span>
            {listing.area?.name_ar && (
              <span className="text-[10px] text-mist flex items-center gap-[2px]">
                <svg viewBox="0 0 24 24" className="w-[9px] h-[9px]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {listing.area.name_ar}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="font-display font-black text-[16px] text-olive-deep leading-none" dir="ltr">₪{Number(listing.price).toLocaleString()}</span>
            <span className="text-[10px] text-mist flex items-center gap-[3px]">
              <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {timeAgo(listing.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: horizontal layout (image left) */}
      <div className="flex items-stretch lg:hidden">
        <div className="w-[130px] flex-shrink-0 p-2.5">
          <div className={cn(
            "relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center min-h-[110px]",
            !firstImage && cat.bg
          )}>
            {firstImage ? (
              <Image src={firstImage.url} alt={listing.title} fill className="object-cover" sizes="130px" />
            ) : (
              <span className="text-[36px] select-none">{cat.emoji}</span>
            )}
            {isSold && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[1] rounded-xl">
                <span className="bg-white/90 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">تم البيع</span>
              </div>
            )}
            {isDemo && (
              <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-[8px] font-bold px-1.5 py-[2px] z-[2]" style={{ borderRadius: "0 0 8px 0" }}>
                تجريبي
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 px-3 py-3 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="font-bold text-[13px] text-ink leading-snug flex-1 line-clamp-2">{listing.title}</div>
            <button onClick={handleSave} className="flex-shrink-0 p-0.5 -mt-0.5 text-mist transition-colors" aria-label="حفظ">
              <svg viewBox="0 0 24 24" className={cn("w-[18px] h-[18px] transition-colors", saved ? "fill-olive stroke-olive" : "fill-none stroke-current")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
          </div>
          {listing.description && (
            <p className="text-[11px] text-mist leading-snug line-clamp-2 mb-1.5">{listing.description}</p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className={cn("text-[10px] font-bold px-2 py-[2px] rounded-full", cond.cls)}>{cond.label}</span>
            {listing.area?.name_ar && (
              <span className="text-[10px] text-mist flex items-center gap-[2px]">
                <svg viewBox="0 0 24 24" className="w-[9px] h-[9px]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {listing.area.name_ar}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-[17px] text-olive-deep leading-none" dir="ltr">₪{Number(listing.price).toLocaleString()}</span>
            <span className="text-[10px] text-mist flex items-center gap-[3px]">
              <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {timeAgo(listing.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>

    <PhoneAuthPopup
      open={showLogin}
      onClose={() => setShowLogin(false)}
      mode="login"
      onVerified={async () => {
        setShowLogin(false);
        await refreshContributor();
        doSave();
      }}
    />
    </>
  );
}

// ── Skeleton card for loading state ──
export function ListingCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border/60">
      {/* Desktop vertical skeleton */}
      <div className="hidden lg:block">
        <div className="p-2 pb-0">
          <div className="w-full aspect-[4/3] rounded-xl bg-fog animate-pulse" />
        </div>
        <div className="px-3 py-2.5 space-y-2">
          <div className="h-3.5 w-3/4 rounded-md bg-fog animate-pulse" />
          <div className="h-2.5 w-1/2 rounded-md bg-fog animate-pulse" />
          <div className="flex justify-between items-center pt-1">
            <div className="h-5 w-14 rounded-md bg-fog animate-pulse" />
            <div className="h-3 w-12 rounded-md bg-fog animate-pulse" />
          </div>
        </div>
      </div>
      {/* Mobile horizontal skeleton */}
      <div className="flex items-stretch lg:hidden">
        <div className="w-[130px] flex-shrink-0 p-2.5">
          <div className="w-full min-h-[110px] rounded-xl bg-fog animate-pulse" />
        </div>
        <div className="flex-1 px-3 py-3 space-y-2">
          <div className="h-3.5 w-36 rounded-md bg-fog animate-pulse" />
          <div className="h-2.5 w-28 rounded-md bg-fog animate-pulse" />
          <div className="h-2.5 w-16 rounded-md bg-fog animate-pulse" />
          <div className="flex justify-between items-center mt-3">
            <div className="h-5 w-14 rounded-md bg-fog animate-pulse" />
            <div className="w-7 h-7 rounded-full bg-fog animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
