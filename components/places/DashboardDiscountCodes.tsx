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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:   { label: "نشط",    cls: "bg-[rgba(26,109,48,0.2)] text-[#1A6D30]" },
  inactive: { label: "متوقف",  cls: "bg-[rgba(226,166,37,0.2)] text-[#E2A625]" },
  expired:  { label: "منتهي",  cls: "bg-[rgba(190,50,50,0.2)] text-[#BE3232]" },
  maxed:    { label: "مكتمل",  cls: "bg-[rgba(226,166,37,0.2)] text-[#E2A625]" },
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
    staleTime: 30000,
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

  function resetForm() {
    setCode(""); setDiscountType("percentage"); setDiscountValue("");
    setMinOrderTotal(""); setMaxUses(""); setExpiresAt("");
    setEditingId(null); setShowForm(false);
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
    if (!code.trim() || !discountValue.trim()) return;
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

    return (
      <div
        key={dc.id}
        className={`flex flex-col rounded-2xl bg-white border border-[var(--d-border)]/50 p-[1.125rem] gap-3.5 transition-all ${
          isLoading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {/* ── Header: name + copy | status ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[17px] font-medium tracking-wide truncate">{dc.code}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(dc.code); }}
              className="shrink-0 p-1 h-[26px] flex items-center justify-center text-[var(--d-text-muted)] hover:opacity-60 transition-opacity"
              title="نسخ الكود"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
          </div>
          <span className={`shrink-0 text-[12px] font-medium px-2.5 py-[3px] rounded-full whitespace-nowrap ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* ── Big discount value ── */}
        <div className="text-center py-1.5">
          <div className="text-[40px] font-medium leading-none text-[var(--d-text)]">
            {cleanVal}<span className="text-[22px] text-[var(--d-text-muted)] mr-0.5">{unit}</span>
          </div>
          <div className="text-[13px] text-[var(--d-text-muted)] mt-2">
            {subtitle}{dc.min_order_total > 0 ? ` · حد أدنى ${Number(dc.min_order_total).toFixed(2)} ₪` : ""}
          </div>
        </div>

        {/* ── Usage progress ── */}
        {dc.max_uses && (
          <div>
            <div className="flex justify-between text-[13px] mb-1.5">
              <span className="text-[var(--d-text-muted)]">الاستخدام</span>
              <span className="font-medium text-[var(--d-text)]">{dc.used_count} من {dc.max_uses}</span>
            </div>
            <div className="h-1 bg-[var(--d-border)]/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1A6D30]"
                style={{ width: `${Math.min(100, Math.round((dc.used_count / dc.max_uses) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Expiry date ── */}
        {dc.expires_at && (
          <div className="flex items-center gap-2 text-[13px] flex-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isExpired(dc) ? "text-[#BE3232]" : remaining !== null && remaining <= 7 ? "text-[#E2A625]" : "text-[var(--d-text-muted)]"}`}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-[var(--d-text-muted)]">{formatDate(dc.expires_at)}</span>
            {isExpired(dc) ? (
              <span className="text-[#BE3232] font-medium">· منتهي</span>
            ) : remaining !== null && remaining <= 30 ? (
              <span className="text-[#E2A625] font-medium">· خلال {remaining} يوم</span>
            ) : null}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-1.5 pt-3 border-t border-[var(--d-border)]/50">
          <button
            onClick={() => onEditCode ? onEditCode(dc) : openEdit(dc)}
            className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-[var(--d-text)] bg-[var(--d-subtle-bg)] border border-[var(--d-border)]/50 hover:opacity-80 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            تعديل
          </button>
          <button
            onClick={() => handleToggle(dc)}
            disabled={!!actionLoading}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[var(--d-subtle-bg)] border border-[var(--d-border)]/50 hover:opacity-80 transition-opacity disabled:opacity-50"
            title={dc.active ? "إيقاف مؤقت" : "تفعيل"}
          >
            {dc.active ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button
            onClick={() => handleDelete(dc.id)}
            disabled={!!actionLoading}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[var(--d-subtle-bg)] border border-[var(--d-border)]/50 text-[#DD2828] hover:opacity-80 transition-opacity disabled:opacity-50"
            title="حذف"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
    );
  }

  /* ── MOBILE LAYOUT ── */
  if (mobile) {
    const filteredCodes = search.trim()
      ? codes.filter((dc) => dc.code.toLowerCase().includes(search.trim().toLowerCase()))
      : codes;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-[14px] text-[var(--d-text)]">أكواد الخصم</h3>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-full px-3 py-1.5"
          >
            + إضافة كود
          </button>
        </div>

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

  /* ── DESKTOP LAYOUT ── */
  const desktopFiltered = search.trim()
    ? codes.filter((dc) => dc.code.toLowerCase().includes(search.trim().toLowerCase()))
    : codes;

  return (
    <>
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between shrink-0 pb-4">
        <h3 className="font-display font-bold text-[16px] text-[var(--d-text)]">أكواد الخصم</h3>
        <button
          onClick={() => onAddCode ? onAddCode() : (() => { resetForm(); setShowForm(true); })()}
          className="text-[12px] font-bold text-white bg-[var(--d-green)] rounded-xl px-4 py-2.5 hover:opacity-90 transition-colors flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة كود
        </button>
      </div>

      {!onAddCode && formEl}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-[260px] rounded-2xl bg-[var(--d-border)]/20 animate-pulse" />)}
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
                className="text-[13px] font-bold text-white bg-[var(--d-green)] rounded-xl px-6 py-2.5 hover:opacity-90 transition-colors shadow-lg shadow-[var(--d-green)]/20"
              >
                + إضافة كود خصم
              </button>
            </>
          )}
        </div>
      )}

      {!loading && desktopFiltered.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
