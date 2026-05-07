"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_total: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface DiscountCodeData {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_total: number;
  max_uses: number | null;
  expires_at: string | null;
}

interface Props {
  token: string;
  mobile?: boolean;
  search?: string;
  onAddCode?: () => void;
  onEditCode?: (dc: DiscountCodeData) => void;
}

function fmtDiscount(dc: DiscountCode) {
  const v = Number(dc.discount_value);
  const clean = v % 1 === 0 ? v.toString() : v.toFixed(1);
  return dc.discount_type === "percentage" ? `${clean}%` : `${clean} ₪`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(dateStr: string): number | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  active:   { label: "نشط",    cls: "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)]", dot: "var(--d-green)" },
  inactive: { label: "متوقف",  cls: "bg-[var(--d-amber-bg)] text-[var(--d-amber-text)]", dot: "#EF9F27" },
  expired:  { label: "منتهي الصلاحية", cls: "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border border-[var(--d-border)]/50", dot: "#888780" },
  maxed:    { label: "استُنفد بنجاح",  cls: "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)]", dot: "" },
};

export const DashboardDiscountCodes = forwardRef<{ reload: () => void }, Props>(function DashboardDiscountCodes({ token, mobile, search = "", onAddCode, onEditCode }, ref) {
  const queryClient = useQueryClient();
  const queryKey = ["dashboard-discount-codes", token];

  const { data: codes = [], isLoading: loading } = useQuery<DiscountCode[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiFetch(`/api/places/dashboard/discount-codes?token=${token}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useImperativeHandle(ref, () => ({ reload: () => queryClient.invalidateQueries({ queryKey }) }), [queryClient, queryKey]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderTotal, setMinOrderTotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setCode(""); setDiscountType("percentage"); setDiscountValue("");
    setMinOrderTotal(""); setMaxUses(""); setExpiresAt("");
    setEditingId(null); setShowForm(false); setFormError(null);
  }

  function openEdit(dc: DiscountCode) {
    setCode(dc.code); setDiscountType(dc.discount_type);
    setDiscountValue(String(dc.discount_value));
    setMinOrderTotal(dc.min_order_total > 0 ? String(dc.min_order_total) : "");
    setMaxUses(dc.max_uses ? String(dc.max_uses) : "");
    setExpiresAt(dc.expires_at ? dc.expires_at.slice(0, 10) : "");
    setEditingId(dc.id); setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        code: code.trim().toUpperCase(), discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_total: minOrderTotal ? Number(minOrderTotal) : 0,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
      };
      if (editingId) {
        await apiFetch(`/api/places/dashboard/discount-codes/${editingId}?token=${token}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/api/places/dashboard/discount-codes?token=${token}`, { method: "POST", body: JSON.stringify(body) });
      }
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const saving = saveMutation.isPending;

  async function handleSave() {
    setFormError(null);
    if (!code.trim() || !discountValue.trim()) return;
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        setFormError("لا يمكن إضافة كود بتاريخ انتهاء منتهي الصلاحية");
        return;
      }
    }
    saveMutation.mutate();
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      message: "هل أنت متأكد من حذف هذا الكود؟",
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(`delete-${id}`);
        try {
          await apiFetch(`/api/places/dashboard/discount-codes/${id}?token=${token}`, { method: "DELETE" });
          queryClient.invalidateQueries({ queryKey });
        } catch {}
        setActionLoading(null);
      },
    });
  }

  function handleToggle(dc: DiscountCode) {
    if (dc.active) {
      setConfirmDialog({
        message: "هل تريد إيقاف هذا الكود؟",
        onConfirm: () => {
          setConfirmDialog(null);
          doToggle(dc);
        },
      });
      return;
    }
    doToggle(dc);
  }

  async function doToggle(dc: DiscountCode) {
    // Optimistic: flip active locally
    queryClient.setQueryData<DiscountCode[]>(queryKey, (old) =>
      (old ?? []).map((c) => c.id === dc.id ? { ...c, active: !c.active } : c)
    );
    setActionLoading(`toggle-${dc.id}`);
    try {
      await apiFetch(`/api/places/dashboard/discount-codes/${dc.id}?token=${token}`, { method: "PATCH", body: JSON.stringify({ active: !dc.active }) });
      queryClient.invalidateQueries({ queryKey });
    } catch {
      // Revert on error
      queryClient.setQueryData<DiscountCode[]>(queryKey, (old) =>
        (old ?? []).map((c) => c.id === dc.id ? { ...c, active: dc.active } : c)
      );
    }
    setActionLoading(null);
  }

  const isExpired = (dc: DiscountCode) => dc.expires_at && new Date(dc.expires_at) < new Date();
  const isMaxedOut = (dc: DiscountCode) => dc.max_uses !== null && dc.used_count >= dc.max_uses;

  function getStatus(dc: DiscountCode): string {
    if (!dc.active) return "inactive";
    if (isExpired(dc)) return "expired";
    if (isMaxedOut(dc)) return "maxed";
    return "active";
  }

  /* ── Form (shared for mobile) ── */
  const formEl = showForm && (
    <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3.5 space-y-2.5 shrink-0 mb-3 shadow-sm">
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="الكود (مثال: WELCOME10)" className="w-full border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]" dir="ltr" />
      <div className="flex gap-2">
        <button onClick={() => setDiscountType("percentage")} className={`flex-1 py-2 rounded-lg text-[11px] font-bold border ${discountType === "percentage" ? "bg-[var(--d-green)] text-white border-[var(--d-green)]" : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border-[var(--d-border)]"}`}>نسبة %</button>
        <button onClick={() => setDiscountType("fixed")} className={`flex-1 py-2 rounded-lg text-[11px] font-bold border ${discountType === "fixed" ? "bg-[var(--d-green)] text-white border-[var(--d-green)]" : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border-[var(--d-border)]"}`}>مبلغ ثابت ₪</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "percentage" ? "القيمة %" : "المبلغ ₪"} type="number" className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]" dir="ltr" />
        <input value={minOrderTotal} onChange={(e) => setMinOrderTotal(e.target.value)} placeholder="حد أدنى للطلب ₪" type="number" className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]" dir="ltr" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="عدد الاستخدامات" type="number" className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]" dir="ltr" />
        <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} placeholder="تاريخ الانتهاء" type="date" className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]" dir="ltr" />
      </div>
      {formError && <p className="text-[11px] text-red-500 font-medium">{formError}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !code.trim() || !discountValue.trim()} className="flex-1 py-2 rounded-lg bg-[var(--d-green)] text-white text-[12px] font-bold disabled:opacity-50">{saving ? "..." : editingId ? "تحديث" : "إضافة"}</button>
        <button onClick={resetForm} className="flex-1 py-2 rounded-lg bg-[var(--d-subtle-bg)] border border-[var(--d-border)] text-[var(--d-text)] text-[12px] font-bold">إلغاء</button>
      </div>
    </div>
  );

  /* ── Card renderer ── */
  function renderCard(dc: DiscountCode) {
    const isLoading = actionLoading === `toggle-${dc.id}` || actionLoading === `delete-${dc.id}`;
    const status = getStatus(dc);
    const badge = STATUS_BADGE[status];

    const v = Number(dc.discount_value);
    const cleanVal = v % 1 === 0 ? v.toString() : v.toFixed(1);
    const unit = dc.discount_type === "percentage" ? "%" : "₪";
    const subtitle = dc.discount_type === "percentage" ? "خصم نسبي" : "خصم ثابت";
    const remaining = dc.expires_at ? daysUntil(dc.expires_at) : null;
    const usagePct = dc.max_uses ? Math.min(100, Math.round((dc.used_count / dc.max_uses) * 100)) : 0;
    const barColor = status === "inactive" ? "#EF9F27" : status === "expired" ? "#888780" : "var(--d-green)";

    return (
      <div
        key={dc.id}
        className={`flex flex-col rounded-xl p-4 transition-all bg-[var(--d-card)] border border-[var(--d-border)]/50 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* ── Header: status badge (right) | icons + code name (left) ── */}
        <div className="flex items-center justify-between mb-2.5">
          <span className={`inline-flex items-center gap-[5px] text-[11px] font-medium px-2.5 py-[3px] rounded-full whitespace-nowrap ${badge.cls}`}>
            {status === "maxed" ? (
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : badge.dot ? (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
            ) : null}
            {badge.label}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { navigator.clipboard.writeText(dc.code); }}
              className="w-[26px] h-[26px] inline-flex items-center justify-center rounded-md border border-[var(--d-border)]/50 text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] hover:text-[var(--d-text)] transition-colors"
              title="نسخ"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <span className="font-mono text-[13px] font-medium tracking-[0.3px] text-[var(--d-text)]">{dc.code}</span>
          </div>
        </div>

        {/* ── Big discount value ── */}
        <div className="text-center my-3">
          <p className="text-[30px] font-medium leading-none text-[var(--d-text)] tabular-nums" dir="ltr">
            {dc.discount_type === "fixed" ? `‎₪${cleanVal}` : `${cleanVal}%`}
          </p>
          <p className="text-[12px] text-[var(--d-text-muted)] mt-1.5">
            {subtitle}{dc.min_order_total > 0 ? ` · حد أدنى ₪${Number(dc.min_order_total).toFixed(0)}` : ""}
          </p>
        </div>

        {/* ── Usage progress ── */}
        {dc.max_uses && (
          <div className="mb-3">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-[11px] text-[var(--d-text-muted)]">الاستخدام</span>
              <span className="text-[11px] tabular-nums">
                <span className="font-medium text-[var(--d-text)]">{dc.used_count} من {dc.max_uses}</span>
                <span className="text-[var(--d-text-muted)]"> · {usagePct}%</span>
              </span>
            </div>
            <div className="w-full h-[5px] bg-[var(--d-subtle-bg)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${usagePct}%`, background: barColor }} />
            </div>
          </div>
        )}

        {/* ── KV info grid ── */}
        {dc.expires_at && (
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md mb-3 bg-[var(--d-subtle-bg)]">
            <div>
              <p className={`text-[10px] mb-0.5 ${
                isExpired(dc) ? "text-[var(--d-text-muted)]" : remaining !== null && remaining <= 30 ? "text-[var(--d-red-text)]" : "text-[var(--d-text-muted)]"
              }`}>{isExpired(dc) ? "انتهت" : "ينتهي"}</p>
              <p className={`text-[12px] font-medium ${
                isExpired(dc) ? "text-[var(--d-text)]" : remaining !== null && remaining <= 30 ? "text-[var(--d-red-text)]" : "text-[var(--d-text)]"
              }`}>
                {isExpired(dc)
                  ? `قبل ${Math.abs(Math.ceil((new Date(dc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} يوماً`
                  : remaining !== null ? `خلال ${remaining} يوم` : formatDate(dc.expires_at)
                }
              </p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-[var(--d-text-muted)] mb-0.5">استخدامات</p>
              <p className="text-[12px] font-medium text-[var(--d-text)]">{dc.used_count}</p>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-1 pt-2.5 border-t border-[var(--d-border)]/50">
          <button
            onClick={() => onEditCode ? onEditCode(dc) : openEdit(dc)}
            className="w-[26px] h-[26px] inline-flex items-center justify-center rounded-md bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] hover:opacity-80 transition-colors"
            title="تعديل"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            onClick={() => handleToggle(dc)}
            disabled={!!actionLoading}
            className={`w-[26px] h-[26px] inline-flex items-center justify-center rounded-md hover:opacity-80 transition-colors disabled:opacity-50 ${
              dc.active ? "bg-[var(--d-gray-alt-bg)] text-[var(--d-gray-alt-text)]" : "bg-[var(--d-blue-bg)] text-[var(--d-blue-text)]"
            }`}
            title={dc.active ? "إيقاف مؤقت" : "تفعيل"}
          >
            {dc.active ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button
            onClick={() => handleDelete(dc.id)}
            disabled={!!actionLoading}
            className="w-[26px] h-[26px] inline-flex items-center justify-center rounded-md bg-[var(--d-red-bg)] text-[var(--d-red-text)] hover:opacity-80 transition-colors disabled:opacity-50"
            title="حذف"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    );
  }

  /* ── MOBILE LAYOUT ── */
  const [mobileFilter, setMobileFilter] = useState<string>("all");

  if (mobile) {
    const searchFiltered = search.trim()
      ? codes.filter((dc) => dc.code.toLowerCase().includes(search.trim().toLowerCase()))
      : codes;

    const filteredCodes = mobileFilter === "all" ? searchFiltered
      : searchFiltered.filter((dc) => getStatus(dc) === mobileFilter);

    const mActiveCnt = codes.filter(dc => getStatus(dc) === "active").length;
    const mInactiveCnt = codes.filter(dc => getStatus(dc) === "inactive").length;
    const mExpiredCnt = codes.filter(dc => getStatus(dc) === "expired" || getStatus(dc) === "maxed").length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[16px] text-[var(--d-text)]">أكواد الخصم</h3>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="text-[12px] font-medium text-white bg-[var(--d-green)] rounded-lg px-3 py-1.5"
          >
            + كود جديد
          </button>
        </div>

        {/* Filter chips */}
        {codes.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            <button onClick={() => setMobileFilter("all")} className={`inline-flex items-center gap-1.5 px-2.5 py-[4px] text-[11px] rounded-full border cursor-pointer transition-colors whitespace-nowrap ${mobileFilter === "all" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
              الكل · {searchFiltered.length}
            </button>
            <button onClick={() => setMobileFilter("active")} className={`inline-flex items-center gap-1.5 px-2.5 py-[4px] text-[11px] rounded-full border cursor-pointer transition-colors whitespace-nowrap ${mobileFilter === "active" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />نشطة · {mActiveCnt}
            </button>
            <button onClick={() => setMobileFilter("inactive")} className={`inline-flex items-center gap-1.5 px-2.5 py-[4px] text-[11px] rounded-full border cursor-pointer transition-colors whitespace-nowrap ${mobileFilter === "inactive" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF9F27]" />متوقفة · {mInactiveCnt}
            </button>
            <button onClick={() => setMobileFilter("expired")} className={`inline-flex items-center gap-1.5 px-2.5 py-[4px] text-[11px] rounded-full border cursor-pointer transition-colors whitespace-nowrap ${mobileFilter === "expired" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#888780]" />منتهية · {mExpiredCnt}
            </button>
          </div>
        )}

        {formEl}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-[200px] rounded-2xl bg-[var(--d-border)]/20 animate-pulse" />)}
          </div>
        )}

        {!loading && filteredCodes.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1={7} y1={7} x2={7.01} y2={7}/>
              </svg>
            </div>
            {search.trim() ? (
              <p className="text-[13px] text-[var(--d-text-muted)]">لا توجد نتائج للبحث</p>
            ) : (
              <>
                <p className="font-bold text-[14px] text-[var(--d-text)] mb-1">لا توجد أكواد خصم</p>
                <p className="text-[12px] text-[var(--d-text-muted)] mb-4 text-center">أضف كود خصم لجذب الزبائن وزيادة المبيعات</p>
                <button
                  onClick={() => onAddCode ? onAddCode() : (() => { resetForm(); setShowForm(true); })()}
                  className="text-[12px] font-bold text-white bg-[var(--d-green)] rounded-xl px-5 py-2.5 hover:opacity-90 transition-colors"
                >
                  + إضافة كود
                </button>
              </>
            )}
          </div>
        )}

        {!loading && filteredCodes.length > 0 && (
          <>
            <div
              ref={sliderRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 scrollbar-hide"
              onScroll={() => {
                const el = sliderRef.current;
                if (!el) return;
                const cardW = el.firstElementChild?.clientWidth ?? 1;
                const idx = Math.round(el.scrollLeft / (cardW + 12));
                setActiveSlide(Math.min(idx, filteredCodes.length - 1));
              }}
            >
              {filteredCodes.map((dc) => (
                <div key={dc.id} className="w-[85vw] max-w-[320px] shrink-0 snap-center">
                  {renderCard(dc)}
                </div>
              ))}
            </div>
            {filteredCodes.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                {filteredCodes.slice(0, 8).map((dc, i) => (
                  <div key={dc.id} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeSlide ? "bg-[var(--d-green)]" : "bg-[var(--d-text-muted)]/40"}`} />
                ))}
                {filteredCodes.length > 8 && <span className="text-[9px] text-[var(--d-text-muted)] mr-0.5">+{filteredCodes.length - 8}</span>}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const [activeFilter, setActiveFilter] = useState<string>("all");

  /* ── DESKTOP LAYOUT ── */
  const desktopAll = search.trim()
    ? codes.filter((dc) => dc.code.toLowerCase().includes(search.trim().toLowerCase()))
    : codes;

  const desktopFiltered = activeFilter === "all" ? desktopAll
    : desktopAll.filter((dc) => getStatus(dc) === activeFilter);

  const activeCnt = codes.filter(dc => getStatus(dc) === "active").length;
  const inactiveCnt = codes.filter(dc => getStatus(dc) === "inactive").length;
  const expiredCnt = codes.filter(dc => getStatus(dc) === "expired" || getStatus(dc) === "maxed").length;

  return (
    <>
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-3.5">
        <div>
          <h2 className="text-[18px] font-medium text-[var(--d-text)] m-0">أكواد الخصم</h2>
          <p className="text-[12px] text-[var(--d-text-muted)] mt-0.5">شجّع زبائنك على الطلب وتتبّع أداء الأكواد</p>
        </div>
        <button
          onClick={() => onAddCode ? onAddCode() : (() => { resetForm(); setShowForm(true); })()}
          className="text-[13px] font-medium text-white bg-[var(--d-green)] rounded-lg px-3.5 py-[7px] hover:opacity-90 transition-colors"
        >
          + كود جديد
        </button>
      </div>

      {/* Stats strip */}
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        <button onClick={() => setActiveFilter("all")} className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] rounded-full border cursor-pointer transition-colors ${activeFilter === "all" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
          الكل · {desktopAll.length}
        </button>
        <button onClick={() => setActiveFilter("active")} className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] rounded-full border cursor-pointer transition-colors ${activeFilter === "active" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />نشطة · {activeCnt}
        </button>
        <button onClick={() => setActiveFilter("inactive")} className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] rounded-full border cursor-pointer transition-colors ${activeFilter === "inactive" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF9F27]" />متوقفة · {inactiveCnt}
        </button>
        <button onClick={() => setActiveFilter("expired")} className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] rounded-full border cursor-pointer transition-colors ${activeFilter === "expired" ? "bg-[var(--d-mint-bg)] text-[var(--d-mint-text)] font-medium border-transparent" : "bg-transparent text-[var(--d-text)] border-[var(--d-border)]"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#888780]" />منتهية · {expiredCnt}
        </button>
      </div>

      {!onAddCode && formEl}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-[240px] rounded-xl bg-[var(--d-border)]/20 animate-pulse" />)}
        </div>
      )}

      {!loading && desktopFiltered.length === 0 && !showForm && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1={7} y1={7} x2={7.01} y2={7}/>
            </svg>
          </div>
          {search.trim() ? (
            <p className="text-[13px] text-[var(--d-text-muted)]">لا توجد نتائج للبحث</p>
          ) : (
            <>
              <p className="font-bold text-[16px] text-[var(--d-text)] mb-1">لا توجد أكواد خصم</p>
              <p className="text-[13px] text-[var(--d-text-muted)] mb-5 text-center">أنشئ أكواد خصم لجذب الزبائن وزيادة الطلبات</p>
              <button
                onClick={() => onAddCode ? onAddCode() : (() => { resetForm(); setShowForm(true); })()}
                className="text-[13px] font-medium text-white bg-[var(--d-green)] rounded-lg px-5 py-2.5 hover:opacity-90 transition-colors"
              >
                + إضافة كود خصم
              </button>
            </>
          )}
        </div>
      )}

      {!loading && desktopFiltered.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {desktopFiltered.map((dc) => <div key={dc.id}>{renderCard(dc)}</div>)}
          </div>
        </div>
      )}
    </div>

    {/* Confirm dialog */}
    {confirmDialog && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
        <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDialog(null)} />
        <div className="relative bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl shadow-xl p-5 max-w-[320px] w-full mx-4">
          <p className="text-[13px] font-bold text-[var(--d-text)] mb-4">{confirmDialog.message}</p>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setConfirmDialog(null)}
              className="px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--d-text-muted)] bg-[var(--d-subtle-bg)] border border-[var(--d-border)]"
            >
              إلغاء
            </button>
            <button
              onClick={confirmDialog.onConfirm}
              className="px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-red-500"
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
});
