"use client";

import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useContributorMe, useUpdateContributorMe, useAreas } from "@/lib/queries/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrustLevelBar } from "@/components/trust/TrustLevelBar";
import { TRUST_LEVEL_LABELS, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { toArabicNumerals } from "@/lib/arabic";
import { getReportsToNextLevel } from "@/lib/trust";
import { Skeleton } from "@/components/ui/Skeleton";
import { useArea } from "@/hooks/useArea";
import Link from "next/link";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import type { Contributor } from "@/types/app";
import type { Area } from "@/types/app";
import { cn } from "@/lib/utils";

const GOV_LABELS: Record<string, string> = {
  north: "شمال غزة",
  central: "وسط القطاع",
  south: "جنوب غزة",
};

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
  const updateMe = useUpdateContributorMe();
  const { data: areasData } = useAreas();
  const { saveArea, area: savedArea } = useArea();

  const [openEditHandle, setOpenEditHandle] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [editHandleError, setEditHandleError] = useState<string | null>(null);
  const [openAreaPicker, setOpenAreaPicker] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const areas = areasData?.areas ?? [];
  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ["north", "central", "south"];

  const openHandleModal = () => {
    setHandleInput(contributor?.display_handle ?? "");
    setEditHandleError(null);
    setOpenEditHandle(true);
  };

  const submitHandle = async () => {
    const val = handleInput.trim() || null;
    if (val !== null && val.length > 30) {
      setEditHandleError("اللقب يجب أن يكون أقل من ٣٠ حرفاً");
      return;
    }
    setEditHandleError(null);
    try {
      await updateMe.mutateAsync({ display_handle: val });
      setOpenEditHandle(false);
    } catch (err: unknown) {
      const data = err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {};
      const msg = typeof (data as ApiErrorResponse)?.message === "string" ? (data as ApiErrorResponse).message : "حدث خطأ";
      setEditHandleError(msg);
    }
  };

  const onSelectArea = async (selected: Area) => {
    setAreaError(null);
    try {
      await updateMe.mutateAsync({ area_id: selected.id });
      saveArea(selected);
      setOpenAreaPicker(false);
    } catch (err: unknown) {
      const res = err && typeof err === "object" && "status" in err ? { status: (err as { status: number }).status } : { status: 500 };
      const data = err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {};
      handleApiError(res as Response, data, setAreaError, router);
    }
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    try {
      const res = await fetch("/api/contributors/me", { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError((data?.message as string) || "حدث خطأ");
        return;
      }
      localStorage.clear();
      router.replace("/onboarding");
    } catch {
      setDeleteError("حدث خطأ، جرّب مرة أخرى");
    }
  };

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
      {/* Header — always show avatar + name (never skeleton here so they're never missing) */}
      <div className="bg-ink px-5 pt-5 pb-6 flex-shrink-0">
        {/* Avatar + name — always visible with real content or fallbacks */}
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
                ? " · منذ " + new Date(contributor.joined_at).toLocaleDateString("ar-EG", { month: "long", year: "numeric" })
                : ""}
            </div>
          </div>
        </div>

        {/* Stats — always show the 3 boxes with values (0 while loading), never skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: trustScoreTotal, label: "نقطة ثقة" },
            { val: contributor?.confirmation_count ?? 0, label: "تأكيد قدّمته" },
            { val: contributor?.report_count ?? 0, label: "سعر أضفته" },
          ].map(({ val, label }) => (
            <div
              key={label}
              className="rounded-xl border border-white/30 bg-white/25 p-2.5 text-center"
            >
              <div className="font-display font-extrabold text-2xl leading-none text-white">
                {toArabicNumerals(val)}
              </div>
              <div className="text-[10px] text-white/80 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-24 space-y-4">

        {contributor?.is_banned && (
          <div className="rounded-xl bg-red-100 border border-red-300 px-4 py-3 text-red-800 text-sm font-body text-center">
            حسابك موقوف
          </div>
        )}

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

        {/* Settings — editable: display_handle, area; delete with confirm */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الإعدادات</div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenAreaPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-fog text-right"
            >
              <span className="text-sm text-ink">منطقتي</span>
              <span className="text-sm text-mist">{area?.name_ar ?? savedArea?.name_ar ?? "—"} ›</span>
            </button>
            <button
              type="button"
              onClick={openHandleModal}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-fog text-right"
            >
              <span className="text-sm text-ink">اسم العرض</span>
              <span className="text-sm text-mist">{contributor?.display_handle ?? "غير محدد"} ›</span>
            </button>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-fog">
              <span className="text-sm text-ink">الإشعارات</span>
              <span className="text-xs text-mist bg-fog px-2 py-0.5 rounded-full">قريباً</span>
            </div>
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-[#C0622A]">حذف بياناتي</span>
              <span className="text-[#C0622A] text-sm">›</span>
            </button>
          </div>
        </div>

        {/* Edit handle modal */}
        {openEditHandle && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={() => setOpenEditHandle(false)} />
            <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-4 shadow-xl">
              <h3 className="font-display font-bold text-ink mb-3">تغيير اسم العرض</h3>
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                maxLength={31}
                placeholder="اختياري، ٣٠ حرفاً كحد أقصى"
                className="w-full rounded-xl border border-border px-4 py-3 text-ink font-body text-sm outline-none"
                dir="rtl"
              />
              {editHandleError && (
                <ApiErrorBox message={editHandleError} onDismiss={() => setEditHandleError(null)} />
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setOpenEditHandle(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-ink font-body font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={submitHandle}
                  disabled={updateMe.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-olive text-white font-body font-semibold disabled:opacity-50"
                >
                  حفظ
                </button>
              </div>
            </div>
          </>
        )}

        {/* Area picker sheet */}
        {openAreaPicker && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={() => setOpenAreaPicker(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[75vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
              <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
                <h2 className="font-display font-bold text-ink">اختر المنطقة</h2>
                <button type="button" onClick={() => setOpenAreaPicker(false)} className="text-mist hover:text-ink p-1 text-lg leading-none" aria-label="إغلاق">×</button>
              </div>
              {areaError && (
                <div className="mx-4 mt-2 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{areaError}</div>
              )}
              <div className="overflow-y-auto no-scrollbar flex-1 px-4 py-3">
                {govOrder.map((gov) => {
                  const govAreas = grouped[gov];
                  if (!govAreas?.length) return null;
                  return (
                    <div key={gov} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] font-bold text-mist uppercase tracking-widest">{GOV_LABELS[gov]}</span>
                      </div>
                      {govAreas.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onSelectArea(a)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right",
                            (area?.id ?? savedArea?.id) === a.id ? "border-olive bg-olive-pale" : "border-border bg-white hover:border-olive-mid"
                          )}
                        >
                          <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", (area?.id ?? savedArea?.id) === a.id ? "border-olive bg-olive" : "border-border")}>
                            {(area?.id ?? savedArea?.id) === a.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1">
                            <div className={cn("font-display font-bold text-sm", (area?.id ?? savedArea?.id) === a.id ? "text-olive-deep" : "text-ink")}>{a.name_ar}</div>
                            <div className="text-xs text-mist mt-0.5">{GOV_LABELS[a.governorate]}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={() => setShowDeleteConfirm(false)} />
            <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-4 shadow-xl">
              <p className="font-body text-ink mb-4 text-center">هل أنت متأكد؟ سيتم حذف جميع بياناتك نهائياً</p>
              {deleteError && <ApiErrorBox message={deleteError} onDismiss={() => setDeleteError(null)} />}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-ink font-body font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={false}
                  className="flex-1 py-2.5 rounded-xl bg-[#C0622A] text-white font-body font-semibold"
                >
                  نعم، احذف حسابي
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
