"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { useContributorMe, useUpdateContributorMe, useAreas } from "@/lib/queries/hooks";
import { useRouter } from "next/navigation";
import { TrustLevelBar } from "@/components/trust/TrustLevelBar";
import { TRUST_LEVEL_LABELS } from "@/lib/constants";
import { toArabicNumerals } from "@/lib/arabic";
import { getReportsToNextLevel } from "@/lib/trust";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { useArea } from "@/hooks/useArea";
import Link from "next/link";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { handleApiError } from "@/lib/api/errors";
import { apiFetch } from "@/lib/api/fetch";
import type { ApiErrorResponse } from "@/lib/api/errors";
import type { Contributor, Area } from "@/types/app";
import { cn } from "@/lib/utils";
import { useSoundMuted } from "@/hooks/useSoundMuted";
import { clearStoredToken } from "@/lib/auth/token";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { useGlobalSidebar } from "@/components/layout/GlobalDesktopShell";

const GOV_LABELS: Record<string, string> = {
  north: "شمال غزة",
  central: "وسط القطاع",
  south: "جنوب غزة",
};

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

function getTrustScoreTotal(data: unknown): number {
  if (data && typeof data === "object" && "trust_score_total" in data && typeof (data as { trust_score_total: unknown }).trust_score_total === "number") {
    return (data as { trust_score_total: number }).trust_score_total;
  }
  return 0;
}

function profileInitial(contributor: Contributor | null): string {
  const name = contributor?.display_handle?.trim();
  if (name && name.length > 0) return name.slice(0, 1);
  return "م";
}

function useProfile() {
  const { loading: sessionLoading } = useSession();
  const { data: apiData, isLoading: apiLoading } = useContributorMe({
    enabled: !sessionLoading,
  });

  const contributor = normalizeContributor(apiData);
  const trustScoreTotal = getTrustScoreTotal(apiData);
  const statsLoading = sessionLoading || apiLoading;
  const contributionsLoading = sessionLoading || apiLoading;

  return { contributor, loading: sessionLoading, trustScoreTotal, contributionsLoading, statsLoading };
}

export function DesktopProfilePanel() {
  const { contributor, trustScoreTotal, contributionsLoading, statsLoading } = useProfile();
  const { accessToken } = useSession();
  const router = useRouter();
  const updateMe = useUpdateContributorMe();
  const { data: areasData } = useAreas();
  const { saveArea, area: savedArea } = useArea();

  useGlobalSidebar(
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">حسابي</div>
      <Link href="/account" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body text-ink hover:bg-fog transition-colors">
        مستوى الثقة
      </Link>
      <Link href="/account/reports" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body text-ink hover:bg-fog transition-colors">
        مساهماتي
      </Link>
    </div>
  );

  const [openEditHandle, setOpenEditHandle] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [editHandleError, setEditHandleError] = useState<string | null>(null);
  const [isUpdatingHandle, setIsUpdatingHandle] = useState(false);
  const [openAreaPicker, setOpenAreaPicker] = useState(false);
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>({});
  const areaPickerRef = useRef<HTMLDivElement>(null);
  const [areaError, setAreaError] = useState<string | null>(null);

  useEffect(() => {
    if (!openAreaPicker) return;
    function handleClick(e: MouseEvent) {
      if (areaPickerRef.current && !areaPickerRef.current.contains(e.target as Node)) setOpenAreaPicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openAreaPicker]);
  const [isUpdatingArea, setIsUpdatingArea] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [soundMuted, setSoundMuted] = useSoundMuted();

  const areas = areasData?.areas ?? [];
  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ["north", "central", "south"];

  const area = contributor?.area;

  const openHandleModal = () => {
    setHandleInput(contributor?.display_handle ?? "");
    setEditHandleError(null);
    setOpenEditHandle(true);
  };

  const submitHandle = () => {
    const val = handleInput.trim() || null;
    if (val !== null && val.length > 30) {
      setEditHandleError("اللقب يجب أن يكون أقل من ٣٠ حرفاً");
      return;
    }
    setEditHandleError(null);
    setOpenEditHandle(false);
    setIsUpdatingHandle(true);
    updateMe.mutate(
      {
        display_handle: val,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
      {
        onSuccess: () => setIsUpdatingHandle(false),
        onError: (err: unknown) => {
          const data = err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {};
          setEditHandleError(typeof (data as ApiErrorResponse)?.message === "string" ? (data as ApiErrorResponse).message : "حدث خطأ");
          setIsUpdatingHandle(false);
        },
      }
    );
  };

  const onSelectArea = (selected: Area) => {
    setAreaError(null);
    setOpenAreaPicker(false);
    saveArea(selected);
    setIsUpdatingArea(true);
    updateMe.mutate(
      {
        area_id: selected.id,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
      {
        onSuccess: () => setIsUpdatingArea(false),
        onError: (err: unknown) => {
          const res = err && typeof err === "object" && "status" in err ? { status: (err as { status: number }).status } : { status: 500 };
          const data = err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {};
          handleApiError(res as Response, data, setAreaError, router);
          setIsUpdatingArea(false);
        },
      }
    );
  };

  const handleLogout = () => {
    clearStoredToken();
    window.location.reload();
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    try {
      const res = await apiFetch("/api/contributors/me", {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Profile header */}
      <div className="rounded-2xl px-6 pt-6 pb-5 bg-olive">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 shrink-0 flex items-center justify-center text-2xl font-display font-bold text-white"
            aria-hidden
          >
            {statsLoading ? (
              <Skeleton className="h-6 w-6 rounded-full bg-white/40" />
            ) : (
              profileInitial(contributor)
            )}
          </div>
          <div className="min-w-0 flex-1">
            {statsLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 bg-white/30 rounded" />
                <Skeleton className="h-3 w-28 bg-white/20 rounded" />
              </div>
            ) : (
              <>
                <div className="font-display font-bold text-lg text-white truncate">
                  {contributor?.display_handle
                    ? contributor.display_handle
                    : contributor
                      ? "مساهم " + TRUST_LEVEL_LABELS[contributor.trust_level]
                      : "مساهم مجهول"}
                </div>
                <div className="text-xs text-white/70 font-mono mt-0.5">
                  #{(typeof contributor?.anon_session_id === "string" ? contributor.anon_session_id : contributor?.id ?? "").slice(-4) || "----"}
                  {contributor?.joined_at
                    ? " · منذ " + new Date(contributor.joined_at).toLocaleDateString("ar-EG", { month: "long", year: "numeric" })
                    : ""}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: trustScoreTotal, label: "نقطة ثقة" },
            { val: contributor?.confirmation_count ?? 0, label: "تأكيد قدّمته" },
            { val: contributor?.report_count ?? 0, label: "سعر أضفته" },
          ].map(({ val, label }) => (
            <div
              key={label}
              className="rounded-xl border border-white/20 bg-white/15 p-3 text-center"
            >
              {statsLoading ? (
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-7 w-10 bg-white/30 rounded" />
                  <div className="text-[10px] text-white/70">{label}</div>
                </div>
              ) : (
                <>
                  <div className="font-display font-extrabold text-2xl leading-none text-white">
                    {toArabicNumerals(val)}
                  </div>
                  <div className="text-[10px] text-white/70 mt-1">{label}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {contributor?.is_banned && (
        <div className="rounded-xl bg-red-100 border border-red-300 px-4 py-3 text-red-800 text-sm font-body text-center">
          حسابك موقوف
        </div>
      )}

      {/* Login prompt for unverified users */}
      {!statsLoading && contributor && !contributor.phone_verified && (
        <div className="bg-surface rounded-2xl border border-olive-mid/40 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-olive-pale flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 9.18 19.79 19.79 0 01.88 2.27 2 2 0 012.88.09H5.9a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.19-1.19a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm text-ink mb-0.5">سجّل دخولك برقم هاتفك</div>
            <div className="text-xs text-mist">لحفظ بياناتك ومزامنتها عبر أجهزتك</div>
          </div>
          <button
            type="button"
            onClick={() => setShowChangePhone(true)}
            className="flex-shrink-0 bg-olive text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-olive-deep transition-colors cursor-pointer"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {/* Trust level + Contributions grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Trust level */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">مستوى الثقة</div>
          <div className="bg-surface rounded-2xl p-5 border border-border">
            {statsLoading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-3/4 mx-auto rounded-lg" />
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* My contributions */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">مساهماتي</div>
          {contributionsLoading ? (
            <div className="bg-surface rounded-2xl p-6 border border-border">
              <div className="space-y-3 flex flex-col items-center">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
          ) : (contributor?.report_count ?? 0) === 0 ? (
            <div className="bg-surface rounded-2xl p-6 border-[1.5px] border-dashed border-border text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="font-display font-bold text-sm text-ink mb-1">لم تضف أي سعر أو منتج بعد</div>
              <div className="text-xs text-mist mb-3">ابدأ بإضافة سعر أو اقتراح منتج جديد</div>
            </div>
          ) : (
            <Link
              href="/account/reports"
              className="bg-surface rounded-2xl px-5 py-4 border border-border flex items-center justify-between hover:border-olive/50 transition-colors"
            >
              <span className="text-sm font-display font-bold text-ink">عرض أسعاري ومنتجاتي</span>
              <span className="text-mist text-sm">‹</span>
            </Link>
          )}
        </div>
      </div>

      {/* Settings */}
      <div>
        <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الإعدادات</div>
        <div className="bg-surface rounded-2xl border border-border">
          <div className="border-b border-fog relative" ref={areaPickerRef}>
            <button
              type="button"
              onClick={() => !statsLoading && !isUpdatingArea && setOpenAreaPicker((v) => !v)}
              disabled={statsLoading || isUpdatingArea}
              className="w-full flex items-center justify-between px-5 py-4 text-right disabled:opacity-90 hover:bg-fog/50 transition-colors cursor-pointer"
            >
              <span className="text-sm text-ink">منطقتي</span>
              {(statsLoading || isUpdatingArea) ? (
                <LoaderDots size="sm" className="flex-shrink-0" />
              ) : (
                <span className="text-sm text-mist">{area?.name_ar ?? savedArea?.name_ar ?? "—"} ›</span>
              )}
            </button>
            {openAreaPicker && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fade-up">
                <div className="max-h-64 overflow-y-auto no-scrollbar p-2">
                  {govOrder.map((gov) => {
                    const govAreas = grouped[gov];
                    if (!govAreas?.length) return null;
                    const isGovOpen = openGovs[gov] ?? false;
                    return (
                      <div key={gov}>
                        <button
                          type="button"
                          onClick={() => setOpenGovs((prev) => ({ ...prev, [gov]: !prev[gov] }))}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-display font-bold text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                        >
                          <span>{GOV_LABELS[gov]}</span>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            className={cn("text-mist transition-transform", isGovOpen && "rotate-90")}
                          >
                            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                        {isGovOpen && (
                          <div className="mr-3 mt-0.5 space-y-0.5">
                            {govAreas.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => onSelectArea(a)}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-body transition-colors text-right cursor-pointer",
                                  (area?.id ?? savedArea?.id) === a.id
                                    ? "bg-olive-pale text-olive font-semibold"
                                    : "text-slate hover:bg-fog hover:text-ink"
                                )}
                              >
                                <span>{a.name_ar}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {areaError && !openAreaPicker && (
              <div className="px-5 pb-2">
                <ApiErrorBox message={areaError} onDismiss={() => setAreaError(null)} />
              </div>
            )}
          </div>
          <div className="border-b border-fog">
            <button
              type="button"
              onClick={() => !statsLoading && !isUpdatingHandle && openHandleModal()}
              disabled={statsLoading || isUpdatingHandle}
              className="w-full flex items-center justify-between px-5 py-4 text-right disabled:opacity-90 hover:bg-fog/50 transition-colors cursor-pointer"
            >
              <span className="text-sm text-ink">اسم العرض</span>
              {(statsLoading || isUpdatingHandle) ? (
                <LoaderDots size="sm" className="flex-shrink-0" />
              ) : (
                <span className="text-sm text-mist">{contributor?.display_handle ?? "غير محدد"} ›</span>
              )}
            </button>
            {editHandleError && !openEditHandle && (
              <div className="px-5 pb-2">
                <ApiErrorBox message={editHandleError} onDismiss={() => setEditHandleError(null)} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-fog">
            <span className="text-sm text-ink">الإشعارات</span>
            <span className="text-xs text-mist bg-fog px-2 py-0.5 rounded-full">قريباً</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-fog">
            <div>
              <span className="text-sm text-ink">أصوات التطبيق</span>
              <p className="text-[11px] text-mist mt-0.5">أصوات عند التأكيد والإبلاغ</p>
            </div>
            <button
              type="button"
              onClick={() => setSoundMuted(!soundMuted)}
              className={cn(
                "relative w-10 h-[22px] rounded-full transition-colors",
                soundMuted ? "bg-fog border border-border" : "bg-olive"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all",
                  soundMuted ? "left-0.5" : "left-[calc(100%-20px)]"
                )}
              />
            </button>
          </div>
          {contributor?.phone_verified && (
            <div className="border-b border-fog">
              <button
                type="button"
                onClick={() => setShowChangePhone(true)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-fog/50 transition-colors cursor-pointer"
              >
                <span className="text-sm text-ink">تغيير رقم الهاتف</span>
                <span className="text-mist text-sm">›</span>
              </button>
            </div>
          )}
          <div className="border-b border-fog">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-50/50 transition-colors cursor-pointer"
            >
              <span className="text-sm text-amber-700">تسجيل الخروج</span>
              <span className="text-amber-700 text-sm">›</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50/50 transition-colors cursor-pointer"
          >
            <span className="text-sm text-[#C0622A]">حذف بياناتي</span>
            <span className="text-[#C0622A] text-sm">›</span>
          </button>
        </div>
      </div>

      {/* Edit handle modal — centered */}
      {openEditHandle && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={() => setOpenEditHandle(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl p-5 shadow-xl" style={{ width: "min(28rem, calc(100vw - 2rem))" }}>
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
              <div className="mt-2">
                <ApiErrorBox message={editHandleError} onDismiss={() => setEditHandleError(null)} />
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpenEditHandle(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-ink font-body font-semibold hover:bg-fog transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={submitHandle}
                disabled={updateMe.isPending}
                className="flex-1 py-2.5 rounded-xl bg-olive text-white font-body font-semibold disabled:opacity-50 hover:bg-olive-deep transition-colors cursor-pointer"
              >
                حفظ
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl p-5 shadow-xl" style={{ width: "min(24rem, calc(100vw - 2rem))" }}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </div>
              <h3 className="font-display font-bold text-ink text-base mb-1">تسجيل الخروج</h3>
              <p className="text-sm text-mist">هل تريد تسجيل الخروج من حسابك؟</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-ink font-semibold text-sm hover:bg-fog transition-colors cursor-pointer">
                إلغاء
              </button>
              <button type="button" onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors cursor-pointer">
                خروج
              </button>
            </div>
          </div>
        </>
      )}

      {/* Change / login phone popup */}
      <PhoneAuthPopup
        open={showChangePhone}
        onClose={() => setShowChangePhone(false)}
        mode="login"
        onVerified={() => {
          setShowChangePhone(false);
          window.location.reload();
        }}
      />

      {/* Delete confirmation — centered */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl p-5 shadow-xl" style={{ width: "min(24rem, calc(100vw - 2rem))" }}>
            <p className="font-body text-ink mb-4 text-center">هل أنت متأكد؟ سيتم حذف جميع بياناتك نهائياً</p>
            {deleteError && <ApiErrorBox message={deleteError} onDismiss={() => setDeleteError(null)} />}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-ink font-body font-semibold hover:bg-fog transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-[#C0622A] text-white font-body font-semibold hover:bg-[#A8521F] transition-colors cursor-pointer"
              >
                نعم، احذف حسابي
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
