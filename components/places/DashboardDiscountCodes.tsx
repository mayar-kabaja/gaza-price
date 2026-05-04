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
  return new Date(dateStr).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
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
    const isDead = status === "inactive" || status === "expired";
    const pct = dc.max_uses ? Math.min(100, Math.round((dc.used_count / dc.max_uses) * 100)) : null;

    return (
      <div
        key={dc.id}
        className={`flex flex-col rounded-[16px] bg-white border border-[var(--d-border)] shadow-sm hover:shadow-md transition-all ${
          isLoading ? "opacity-50 pointer-events-none" : ""
        }`}
        style={{ padding: "16px 0", gap: 24 }}
      >
        {/* ── Header ── */}
        <div className="px-3.5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="font-mono font-bold text-[16px] text-[var(--d-text)] truncate tracking-wider text-right">{dc.code}</div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[10px] text-[var(--d-text-muted)]">{dc.discount_type === "percentage" ? "خصم نسبي" : "خصم ثابت"}</span>
                {dc.min_order_total > 0 && (
                  <>
                    <span className="text-[10px] text-[var(--d-text-muted)]">·</span>
                    <span className="text-[10px] text-[var(--d-text-muted)]">حد أدنى ₪{dc.min_order_total}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex justify-center items-center px-3.5 py-1.5 rounded-[12px] text-[12px] font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(dc.code); }}
                className="w-8 h-8 flex items-center justify-center text-[var(--d-text-muted)] hover:opacity-60 transition-opacity"
                title="نسخ الكود"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2x2 Info Grid ── */}
        <div className="px-4">
          <div className="flex flex-col gap-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              {/* قيمة الخصم */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#98C3A5]/20 flex items-center justify-center shrink-0">
                  <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M15.725 17.297c1.9-.35 2.886-2.235 1.6-4.228a.312.312 0 00-.237-.167.312.312 0 00-.288.042c-.416.258 0 .583.142 1.2.691 2.712-4.055 2.562-3.387 0 .087-.456.333-.867.691-1.16.295-.21.626-.365.977-.457.766-.134 1.134.566 1.417.1.509-.801-3.1-1.811-4.218 1.191-1.618 3.854.46 5.473 2.495 5.098zm11.493 4.797a.416.416 0 00-.545.06.416.416 0 00.033.597c.237.402.348.868.317 1.334-.2 1.593-2.502 1.727-3.337.543a1.873 1.873 0 01.261-2.785c.332-.043.668.03.952.209a.278.278 0 00.345-.247.278.278 0 00-.148-.312 2.362 2.362 0 00-3.503 1.61c-.834 2.244 1.275 3.845 3.336 3.478 1.876-.342 2.869-2.227 1.576-4.228h.001zm2.21-11.603C18.185 17.49 12.28 28.2 10.237 28.9a.278.278 0 00.2.642c1.025-.292 1.76-1.325 2.443-2.002 5.464-5.438 10.118-11.677 16.966-16.406a.278.278 0 00-.417-.443" fill="#4A7C59"/></svg>
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#4A7C59]">{fmtDiscount(dc)}</div>
                  <div className="text-[11px] text-black">قيمة الخصم</div>
                </div>
              </div>
              {/* عدد الاستخدام */}
              <div className="flex items-center gap-2 justify-self-start">
                <div className="w-9 h-9 rounded-lg bg-[#98C3A5]/20 flex items-center justify-center shrink-0">
                  <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M12.5 15.625h1.25v8.75m0 0H12.5m1.25 0H15m1.25-8.75h5v4.375h-4.375v4.375h5m1.25-8.75H27.5V20m0 0h-3.75m3.75 0v4.375h-4.375" stroke="#4A7C59"/></svg>
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#4A7C59]">{dc.used_count}/{dc.max_uses ?? "∞"}</div>
                  <div className="text-[11px] text-black">عدد الاستخدام</div>
                </div>
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* ينتهي في */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#98C3A5]/20 flex items-center justify-center shrink-0">
                  <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M27.917 13.334h-1.806v1.11h1.667v12.222H12.223V14.445h1.666v-1.111h-1.805a1.111 1.111 0 00-1.084 1.005v12.434a1.111 1.111 0 001.084 1.005h15.833a1.111 1.111 0 001.084-1.005V14.339a1.111 1.111 0 00-1.084-1.005z" fill="#4A7C59"/><path d="M14.444 17.778h1.112v1.11h-1.112v-1.11zm3.333 0h1.112v1.11h-1.112v-1.11zm3.334 0h1.11v1.11h-1.11v-1.11zm3.333 0h1.112v1.11h-1.112v-1.11zm-10 2.778h1.112v1.11h-1.112v-1.11zm3.333 0h1.112v1.11h-1.112v-1.11zm3.334 0h1.11v1.11h-1.11v-1.11zm3.333 0h1.112v1.11h-1.112v-1.11zm-10 2.778h1.112v1.11h-1.112v-1.11zm3.333 0h1.112v1.11h-1.112v-1.11zm3.334 0h1.11v1.11h-1.11v-1.11zm3.333 0h1.112v1.11h-1.112v-1.11z" fill="#4A7C59"/><path d="M15.556 15.556a.556.556 0 00.555-.556v-3.333a.556.556 0 00-1.111 0V15a.556.556 0 00.556.556zm8.888 0A.556.556 0 0025 15v-3.333a.556.556 0 00-1.111 0V15a.556.556 0 00.555.556z" fill="#4A7C59"/><path d="M17.223 13.334h5.555v1.11h-5.555v-1.11z" fill="#4A7C59"/></svg>
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#4A7C59]">{dc.expires_at ? formatDate(dc.expires_at) : "—"}</div>
                  <div className="text-[11px] text-black">{dc.expires_at && isExpired(dc) ? "انتهى في" : "ينتهي في"}</div>
                </div>
              </div>
              {/* عدد مرات الاستخدام */}
              <div className="flex items-center gap-2 justify-self-start">
                <div className="w-9 h-9 rounded-lg bg-[#98C3A5]/20 flex items-center justify-center shrink-0">
                  <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M15.2 27.235a1.767 1.767 0 01-.36-1.888c.1-.351.282-.666.52-.907a1.767 1.767 0 012.618 0c.24.241.42.556.52.907a1.767 1.767 0 01-.36 1.888 1.767 1.767 0 01-2.938 0zm7.82 0a1.767 1.767 0 01-.36-1.888c.1-.351.282-.666.52-.907a1.767 1.767 0 012.618 0c.24.241.42.556.52.907a1.767 1.767 0 01-.36 1.888 1.767 1.767 0 01-2.938 0zM13.173 12.917h-1.09a.417.417 0 010-.834h1.2c.13 0 .25.034.356.1.107.068.19.162.249.282l3.232 6.798h5.529c.096 0 .182-.024.257-.072a.511.511 0 00.191-.3l2.797-5.033a.417.417 0 01.716.415l-2.804 5.075a1.25 1.25 0 01-1.106.651H16.75l-1.012 1.858c-.086.128-.088.268-.008.417.08.15.2.225.36.225h8.653a.417.417 0 010 .834H16.09c-.486 0-.85-.204-1.09-.612-.241-.408-.246-.82-.015-1.238l1.253-2.233-3.064-6.43zm6.465 4.848a.513.513 0 01-.362-.875.513.513 0 01.724 0 .513.513 0 01-.362.875zm.064-2.468a.417.417 0 01-.12-.297v-3.333a.417.417 0 01.834 0V15a.417.417 0 01-.714.297z" fill="#4A7C59"/></svg>
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-medium text-[#4A7C59]">{dc.used_count}</div>
                  <div className="text-[11px] text-black">عدد مرات الاستخدام</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="px-3.5">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => onEditCode ? onEditCode(dc) : openEdit(dc)}
              className="h-7 px-3 flex items-center gap-1 rounded-md hover:opacity-80 transition-opacity"
              style={{ background: "#A8D3B5" }}
            >
              <span className="text-[10px] text-[#4A7C59]">تعديل</span>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#4A7C59" strokeWidth={1.5} strokeLinecap="round"><path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z"/></svg>
            </button>
            <button
              onClick={() => handleToggle(dc)}
              disabled={!!actionLoading}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "#E5E4E5" }}
            >
              {dc.active ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button
              onClick={() => handleDelete(dc.id)}
              disabled={!!actionLoading}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "rgba(221, 40, 40, 0.1)" }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#DD2828" strokeWidth={1.5} strokeLinecap="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" /></svg>
            </button>
          </div>
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
