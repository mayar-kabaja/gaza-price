"use client";

import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrustLevelBar } from "@/components/trust/TrustLevelBar";
import { TRUST_LEVEL_LABELS, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { toArabicNumerals } from "@/lib/arabic";
import { getReportsToNextLevel } from "@/lib/trust";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

export default function AccountPage() {
  const { contributor, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to onboarding if no area set
    const done = localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    if (!done) router.replace("/onboarding");
  }, [router]);

  const area = contributor?.area;

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-ink px-5 pt-5 pb-6 flex-shrink-0">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 bg-white/10" />
                <Skeleton className="h-3 w-20 bg-white/10" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/7 border-2 border-white/12 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <div className="font-display font-bold text-base text-white">
                  {contributor?.display_handle ?? "مساهم مجهول"}
                </div>
                <div className="text-[11px] text-white/35 font-mono mt-0.5">
                  #{contributor?.anon_session_id?.slice(-4) ?? "----"} · {contributor ? "انضم " + new Date(contributor.joined_at).toLocaleDateString("ar") : "..."}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: contributor?.report_count ?? 0, label: "سعر أضفته" },
                { val: contributor?.confirmation_count ?? 0, label: "تأكيد قدّمته" },
                { val: 0, label: "نقطة ثقة" },
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
                المستوى {contributor?.trust_level === "new" ? "١" : contributor?.trust_level === "regular" ? "٢" : contributor?.trust_level === "trusted" ? "٣" : "٤"}
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
