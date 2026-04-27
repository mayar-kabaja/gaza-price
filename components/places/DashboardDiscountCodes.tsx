"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/fetch";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_total: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  token: string;
}

export function DashboardDiscountCodes({ token }: Props) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderTotal, setMinOrderTotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/places/dashboard/discount-codes?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data.data || []);
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderTotal("");
    setMaxUses("");
    setExpiresAt("");
    setEditingId(null);
    setShowForm(false);
  }

  function openEdit(dc: DiscountCode) {
    setCode(dc.code);
    setDiscountType(dc.discount_type);
    setDiscountValue(String(dc.discount_value));
    setMinOrderTotal(dc.min_order_total > 0 ? String(dc.min_order_total) : "");
    setMaxUses(dc.max_uses ? String(dc.max_uses) : "");
    setExpiresAt(dc.expires_at ? dc.expires_at.slice(0, 10) : "");
    setEditingId(dc.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!code.trim() || !discountValue.trim()) return;
    setSaving(true);
    try {
      const body: any = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_total: minOrderTotal ? Number(minOrderTotal) : 0,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
      };

      if (editingId) {
        await apiFetch(`/api/places/dashboard/discount-codes/${editingId}?token=${token}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/places/dashboard/discount-codes?token=${token}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await load();
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/api/places/dashboard/discount-codes/${id}?token=${token}`, { method: "DELETE" });
      await load();
    } catch {}
    setDeleting(null);
  }

  async function handleToggle(dc: DiscountCode) {
    try {
      await apiFetch(`/api/places/dashboard/discount-codes/${dc.id}?token=${token}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !dc.is_active }),
      });
      await load();
    } catch {}
  }

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

      {/* Form */}
      {showForm && (
        <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl p-3 space-y-2.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="الكود (مثال: WELCOME10)"
            className="w-full border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]"
            dir="ltr"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setDiscountType("percentage")}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold border ${
                discountType === "percentage"
                  ? "bg-[var(--d-green)] text-white border-[var(--d-green)]"
                  : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border-[var(--d-border)]"
              }`}
            >
              نسبة %
            </button>
            <button
              onClick={() => setDiscountType("fixed")}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold border ${
                discountType === "fixed"
                  ? "bg-[var(--d-green)] text-white border-[var(--d-green)]"
                  : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border-[var(--d-border)]"
              }`}
            >
              مبلغ ثابت ₪
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "القيمة %" : "المبلغ ₪"}
              type="number"
              className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]"
              dir="ltr"
            />
            <input
              value={minOrderTotal}
              onChange={(e) => setMinOrderTotal(e.target.value)}
              placeholder="حد أدنى للطلب ₪"
              type="number"
              className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="عدد الاستخدامات"
              type="number"
              className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]"
              dir="ltr"
            />
            <input
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              placeholder="تاريخ الانتهاء"
              type="date"
              className="border border-[var(--d-border)] rounded-lg px-3 py-2 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]"
              dir="ltr"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !code.trim() || !discountValue.trim()}
              className="flex-1 py-2 rounded-lg bg-[var(--d-green)] text-white text-[12px] font-bold disabled:opacity-50"
            >
              {saving ? "..." : editingId ? "تحديث" : "إضافة"}
            </button>
            <button
              onClick={resetForm}
              className="flex-1 py-2 rounded-lg bg-[var(--d-subtle-bg)] border border-[var(--d-border)] text-[var(--d-text)] text-[12px] font-bold"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--d-border)]/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && codes.length === 0 && !showForm && (
        <div className="text-center py-6 text-[var(--d-text-muted)] text-[12px]">
          لا توجد أكواد خصم — أضف كود لجذب الزبائن
        </div>
      )}

      {/* List */}
      {!loading && codes.map((dc) => (
        <div
          key={dc.id}
          className={`bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl p-3 space-y-1.5 ${!dc.is_active ? "opacity-60" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[14px] text-[var(--d-text)]" dir="ltr">{dc.code}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                dc.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
              }`}>
                {dc.is_active ? "فعّال" : "معطّل"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleToggle(dc)}
                className="text-[10px] font-bold text-[var(--d-text-muted)] hover:text-[var(--d-text)] px-1.5 py-1"
              >
                {dc.is_active ? "تعطيل" : "تفعيل"}
              </button>
              <button
                onClick={() => openEdit(dc)}
                className="text-[10px] font-bold text-[var(--d-green)] px-1.5 py-1"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDelete(dc.id)}
                disabled={deleting === dc.id}
                className="text-[10px] font-bold text-red-500 px-1.5 py-1 disabled:opacity-50"
              >
                {deleting === dc.id ? "..." : "حذف"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--d-text-muted)]">
            <span>
              {dc.discount_type === "percentage" ? `${dc.discount_value}%` : `₪${dc.discount_value}`} خصم
            </span>
            {dc.min_order_total > 0 && <span>حد أدنى ₪{dc.min_order_total}</span>}
            {dc.max_uses && <span>استخدام: {dc.used_count}/{dc.max_uses}</span>}
            {dc.expires_at && <span>حتى {new Date(dc.expires_at).toLocaleDateString("ar")}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
