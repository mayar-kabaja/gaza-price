"use client";

import { useSession } from "@/hooks/useSession";
import { useContributorMe } from "@/lib/queries/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrustLevelBar } from "@/components/trust/TrustLevelBar";
import { TRUST_LEVEL_LABELS, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { toArabicNumerals } from "@/lib/arabic";
import { getReportsToNextLevel } from "@/lib/trust";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import type { Contributor } from "@/types/app";

/** Backend returns { handle, trust_score_total } and may omit display_handle / anon_session_id. Normalize to Contributor-like. */
function normalizeContributor(raw: unknown): Contributor | null {
  if (!raw || typeof raw !== "object" || !("id" in raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    anon_session_id: typeof r.anon_session_id === "string" ? r.anon_session_id : String(r.id ?? ""),
    display_handle:
      typeof r.handle === "string" ? r.handle : typeof r.display_handle === "string" ? r.display_handle : undefined,
    area:
      r.area && typeof r.area === "object" && r.area !== null && "name_ar" in (r.area as object)
        ? (r.area as Contributor["area"])
        : undefined,
    trust_level: (r.trust_level as Contributor["trust_level"]) ?? "new",
    report_count: typeof r.report_count === "number" ? r.report_count : 0,
    confirmation_count: typeof r.confirmation_count === "number" ? r.confirmation_count : 0,
    flag_count: typeof r.flag_count === "number" ? r.flag_count : 0,
    is_banned: Boolean(r.is_banned),
    joined_at: typeof r.joined_at === "string" ? r.joined_at : new Date().toISOString(),
    last_active_at:
      typeof r.last_active_at === "string" ? r.last_active_at : new Date().toISOString(),
  };
}

/** Trust score total from API (backend formatMeProfile). */
function getTrustScoreTotal(data: unknown): number {
  if (data && typeof data === "object" && "trust_score_total" in data && typeof (data as { trust_score_total: unknown }).trust_score_total === "number") {
    return (data as { trust_score_total: number }).trust_score_total;
  }
  return 0;
}

/** Avatar initial: first letter of display_handle or "م" for مساهم */
function profileInitial(contributor: Contributor | null): string {
  const name = contributor?.display_handle?.trim();
  if (name && name.length > 0) return name.slice(0, 1);
  return "م";
}

/** Prefer API contributor when available, else session contributor. */
function useProfile() {
  const { contributor: sessionContributor, loading: sessionLoading } = useSession();
  const { data: apiData } = useContributorMe();

  const apiContributor = normalizeContributor(apiData);
  const contributor: Contributor | null = apiContributor ?? sessionContributor;
  const loading = sessionLoading;
  const trustScoreTotal = getTrustScoreTotal(apiData);

  return { contributor, loading, trustScoreTotal };
}

export default function AccountPage() {
  const { contributor, loading, trustScoreTotal } = useProfile();
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    if (!done) {
      const t = setTimeout(() => router.replace("/onboarding"), 150);
      return () => clearTimeout(t);
    }
  }, [router]);

  const area = contributor?.area;

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header — always show avatar + name (no loading gate so they're never missing) */}
      <div className="bg-ink px-5 pt-5 pb-6 flex-shrink-0">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-full shrink-0 bg-white/30" />
              <div className="space-y-2 min-w-0 flex-1">
                <Skeleton className="h-4 w-32 bg-white/30" />
                <Skeleton className="h-3 w-24 bg-white/25" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl bg-white/20" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Avatar + name — match reference: gray circle with initial, then name / trust label */}
            <div className="flex items-center gap-3 mb-4 min-h-[3rem]">
              <div
                className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/40 shrink-0 flex items-center justify-center text-xl font-display font-bold text-white"
                aria-hidden
              >
                {profileInitial(contributor)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-base text-white truncate">
                  {contributor?.display_handle
                    ? contributor.display_handle
                    : contributor
                      ? "مساهم " + TRUST_LEVEL_LABELS[contributor.trust_level]
                      : "مساهم مجهول"}
                </div>
                <div className="text-[11px] text-white/80 font-mono mt-0.5">
                  #{(typeof contributor?.anon_session_id === "string" ? contributor.anon_session_id : contributor?.id ?? "").slice(-4) || "----"}
                  {contributor?.joined_at
                    ? " · منذ " + new Date(contributor.joined_at).toLocaleDateString("ar-EGP", { month: "long", year: "numeric" })
                    : ""}
                </div>
              </div>
            </div>

            {/* Stats — order like reference: نقطة ثقة, تأكيد قدّمته, سعر أضفته */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: trustScoreTotal, label: "نقطة ثقة" },
                { val: contributor?.confirmation_count ?? 0, label: "تأكيد قدّمته" },
                { val: contributor?.report_count ?? 0, label: "سعر أضفته" },
              ].map(({ val, label }) => (
                <div key={label} className="bg-white/6 border border-white/7 rounded-xl p-2.5 text-center">
                  <div className={`font-display font-extrabold text-2xl leading-none ${val === 0 ? "text-white/20" : "text-white"}`}>
                    {toArabicNumerals(val)}
                  </div>
                  <div className="text-[10px] text-white/35 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-24 space-y-4">

        {/* Trust level */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">مستوى الثقة</div>
          <div className="bg-white rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-bold text-sm text-ink">
                {TRUST_LEVEL_LABELS[contributor?.trust_level ?? "new"]}
              </span>
              <span className="text-xs text-mist bg-fog border border-border rounded-full px-2.5 py-0.5">
                المستوى {contributor?.trust_level === "new" ? "1" : contributor?.trust_level === "regular" ? "2" : contributor?.trust_level === "trusted" ? "3" : "4"}
              </span>
            </div>
            <TrustLevelBar level={contributor?.trust_level ?? "new"} />
            {contributor && (
              <div className="mt-3 text-xs text-mist text-center bg-fog rounded-lg px-3 py-2">
                {getReportsToNextLevel(contributor.trust_level, contributor.report_count) > 0
                  ? `أضف ${toArabicNumerals(getReportsToNextLevel(contributor.trust_level, contributor.report_count))} أسعار للانتقال للمستوى التالي`
                  : "وصلت للمستوى الأعلى 🎉"}
              </div>
            )}
          </div>
        </div>

        {/* My contributions — empty state */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">مساهماتي</div>
          {(contributor?.report_count ?? 0) === 0 ? (
            <div className="bg-white rounded-2xl p-6 border-[1.5px] border-dashed border-border text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="font-display font-bold text-sm text-ink mb-1">لم تضف أي سعر بعد</div>
              <div className="text-xs text-mist mb-3">ابدأ بمشاركة سعر رأيته اليوم</div>
              <Link
                href="/submit"
                className="inline-block bg-olive-pale border border-olive-mid rounded-full px-4 py-1.5 text-xs font-semibold text-olive"
              >
                ➕ أضف سعرك الأول
              </Link>
            </div>
          ) : (
            <Link
              href="/account/reports"
              className="bg-white rounded-2xl px-4 py-3 border border-border flex items-center justify-between"
            >
              <span className="text-sm font-display font-bold text-ink">عرض كل مساهماتي</span>
              <span className="text-mist text-sm">‹</span>
            </Link>
          )}
        </div>

        {/* Settings */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الإعدادات</div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-fog">
              <span className="text-sm text-ink">منطقتي</span>
              <span className="text-sm text-mist">{area?.name_ar ?? "—"} ›</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-fog">
              <span className="text-sm text-ink">اسم العرض</span>
              <span className="text-sm text-mist">{contributor?.display_handle ?? "غير محدد"} ›</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-fog">
              <span className="text-sm text-ink">الإشعارات</span>
              <span className="text-xs text-mist bg-fog px-2 py-0.5 rounded-full">قريباً</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-[#C0622A]">حذف بياناتي</span>
              <span className="text-[#C0622A] text-sm">›</span>
            </div>
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
