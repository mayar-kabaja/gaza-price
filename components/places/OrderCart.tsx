"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { normalizeDigits } from "@/lib/normalize-digits";
import { getItemIcon, getItemBgColor } from "@/components/places/FoodIcons";

export interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderCartProps {
  placeId: string;
  placeWhatsapp?: string | null;
  cart: Map<string, CartItem>;
  onUpdateQty: (id: string, delta: number) => void;
  onClear: () => void;
  onOrderPlaced: (order: any) => void;
  phoneVerified?: boolean;
  userPhone?: string | null;
  userHandle?: string | null;
  onRequireLogin?: () => void;
}

export function OrderSheet({ placeId, placeWhatsapp, cart, onUpdateQty, onClear, onOrderPlaced, phoneVerified, userPhone, userHandle, onRequireLogin }: OrderCartProps) {
  const [name, setName] = useState(userHandle || "");
  const [phone, setPhone] = useState(userPhone || "");

  // Sync after login — useState only sets initial value
  useEffect(() => {
    if (userPhone && !phone) setPhone(userPhone);
  }, [userPhone]);
  useEffect(() => {
    if (userHandle && !name) setName(userHandle);
  }, [userHandle]);
  const [note, setNote] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<{
    valid: boolean;
    discount_type?: string;
    discount_value?: number;
    min_order_total?: number;
    message?: string;
  } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const items = Array.from(cart.values());
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  let discountAmount = 0;
  if (discountResult?.valid && discountResult.discount_value) {
    if (discountResult.discount_type === "percentage") {
      discountAmount = Math.round(subtotal * discountResult.discount_value / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(discountResult.discount_value, subtotal);
    }
  }
  const total = Math.max(0, subtotal - discountAmount);

  async function validateDiscount() {
    if (!discountCode.trim()) return;
    setValidatingCode(true);
    setDiscountResult(null);
    try {
      const res = await apiFetch(`/api/places/${placeId}/discount-codes/validate`, {
        method: "POST",
        body: JSON.stringify({ code: discountCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setDiscountResult({ valid: true, ...data.discount });
      } else {
        setDiscountResult({ valid: false, message: data.message || "كود غير صالح" });
      }
    } catch {
      setDiscountResult({ valid: false, message: "تعذر التحقق" });
    }
    setValidatingCode(false);
  }

  async function submitOrder() {
    if (!phoneVerified) { onRequireLogin?.(); return; }
    if (!name.trim()) { setError("الاسم مطلوب"); return; }
    if (!phone.trim()) { setError("رقم الواتساب مطلوب"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch(`/api/places/${placeId}/orders`, {
        method: "POST",
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_whatsapp: phone.trim(),
          note: note.trim() || undefined,
          discount_code: discountResult?.valid ? discountCode.trim() : undefined,
          items: items.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "حدث خطأ");
        setSubmitting(false);
        return;
      }
      setPlacedOrder(data.data);
      onOrderPlaced(data.data);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
    }
    setSubmitting(false);
  }

  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // Poll order status so cancel button disappears when owner accepts
  useEffect(() => {
    if (!placedOrder || placedOrder.status !== "pending" || cancelled) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch("/api/places/my-orders");
        if (res.ok) {
          const data = await res.json();
          const updated = (data.data || []).find((o: any) => o.id === placedOrder.id);
          if (updated && updated.status !== "pending") {
            setPlacedOrder((prev: any) => ({ ...prev, status: updated.status }));
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [placedOrder, cancelled]);

  async function cancelOrder() {
    if (!placedOrder) return;
    setCancelling(true);
    try {
      const res = await apiFetch(`/api/places/orders/${placedOrder.id}`, { method: "PATCH" });
      if (res.ok) {
        setCancelled(true);
      } else {
        const data = await res.json();
        setError(data.message || "تعذر إلغاء الطلب");
      }
    } catch {
      setError("تعذر الاتصال");
    }
    setCancelling(false);
  }

  // ── Success view ──
  if (placedOrder) {
    const waNum = placeWhatsapp?.replace(/[^0-9]/g, "") || "";

    if (cancelled) {
      return (
        <div className="px-5 py-7 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 border-[3px] border-red-300 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-red-500" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h3 className="font-display font-black text-xl text-ink mb-1.5">تم إلغاء الطلب</h3>
          <p className="text-[13px] text-mist leading-relaxed mb-5">تم إلغاء طلبك رقم #{placedOrder.order_number}</p>
          <button
            onClick={onClear}
            className="w-full py-3 rounded-[14px] bg-fog border border-border text-mist font-display font-bold text-[13px]"
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }

    return (
      <div className="px-5 py-7 text-center">
        {/* Check icon */}
        <div className="w-16 h-16 rounded-full bg-olive-pale border-[3px] border-olive flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-olive" fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 className="font-display font-black text-xl text-ink mb-1.5">تم إرسال طلبك!</h3>
        <p className="text-[13px] text-mist leading-relaxed mb-5">
          طلبك وصل وسيتواصلون معك قريباً لتأكيد الطلب
        </p>

        {/* Order number */}
        <div className="bg-olive-pale border border-olive/15 rounded-xl p-3 flex items-center justify-between mb-5">
          <span className="text-[12px] text-olive">رقم الطلب</span>
          <span className="font-display font-black text-lg text-olive">#{placedOrder.order_number}</span>
        </div>

        {/* WhatsApp button */}
        {waNum && (
          <a
            href={`https://wa.me/${waNum}?text=${encodeURIComponent(`مرحباً، أرسلت طلب رقم #${placedOrder.order_number}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-[#25D366] text-white font-display font-extrabold text-[14px] shadow-[0_4px_14px_rgba(37,211,102,0.3)] mb-2.5"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-white" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            فتح واتساب المطعم
          </a>
        )}

        {/* Cancel order — only while pending */}
        {placedOrder.status === "pending" && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="w-full py-3 rounded-[14px] border border-red-200 text-red-500 font-display font-bold text-[13px] mb-2.5 disabled:opacity-50"
          >
            {cancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
          </button>
        )}

        {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}

        <button
          onClick={onClear}
          className="w-full py-3 rounded-[14px] bg-fog border border-border text-mist font-display font-bold text-[13px]"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // ── Cart + Checkout (single view) ──
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-mist mx-auto mb-2" fill="none" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p className="text-sm text-mist">السلة فارغة</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Cart items */}
      {items.map((item) => (
        <div key={item.menu_item_id} className="flex items-center gap-2.5 bg-surface border border-border rounded-[14px] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-olive/60" style={{ background: getItemBgColor(item.name) }}>
            {getItemIcon(item.name)('w-5 h-5')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-ink truncate">{item.name}</div>
            <div className="text-[11px] text-mist">{item.price.toFixed(2)} ₪ / وحدة</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onUpdateQty(item.menu_item_id, -1)}
              className="w-[26px] h-[26px] rounded-full bg-red-50 text-red-500 flex items-center justify-center text-[15px] font-bold"
            >−</button>
            <span className="font-display font-extrabold text-[14px] text-ink min-w-[18px] text-center">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.menu_item_id, 1)}
              className="w-[26px] h-[26px] rounded-full bg-olive-pale text-olive flex items-center justify-center text-[14px] font-bold"
            >+</button>
          </div>
          <div className="font-display font-black text-[14px] text-olive min-w-[40px] text-left flex-shrink-0">
            {(item.price * item.quantity).toFixed(0)} ₪
          </div>
        </div>
      ))}

      {/* Discount code */}
      <div className="bg-surface border border-border rounded-[14px] p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="text-[11px] font-bold text-ink mb-2 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] stroke-amber-500" fill="none" strokeWidth="2" strokeLinecap="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          كود الخصم
        </div>
        <div className="flex gap-2">
          <input
            value={discountCode}
            onChange={(e) => { setDiscountCode(e.target.value); setDiscountResult(null); }}
            placeholder="أدخل الكود هنا"
            maxLength={20}
            className={`flex-1 bg-fog border-[1.5px] rounded-[10px] px-3 py-2.5 text-[13px] text-ink outline-none transition-colors ${
              discountResult?.valid ? "border-emerald-400 bg-emerald-50" : "border-border focus:border-olive"
            }`}
            dir="ltr"
          />
          <button
            onClick={validateDiscount}
            disabled={validatingCode || !discountCode.trim()}
            className="px-3.5 py-2.5 rounded-[10px] bg-olive text-white font-display font-bold text-[12px] disabled:opacity-50"
          >
            {validatingCode ? "..." : "تطبيق"}
          </button>
        </div>
        {discountResult?.valid && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-[10px] px-3 py-2 mt-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-emerald-500" fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-[12px] font-bold text-emerald-800">
              خصم {discountResult.discount_type === "percentage" ? `${discountResult.discount_value}%` : `₪${discountResult.discount_value}`} تم تطبيقه!
            </span>
          </div>
        )}
        {discountResult && !discountResult.valid && (
          <p className="text-[11px] text-red-500 mt-1.5">{discountResult.message}</p>
        )}
      </div>

      {/* Order summary */}
      <div className="bg-surface border border-border rounded-[14px] p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] text-mist">المجموع الفرعي</span>
          <span className="text-[13px] font-semibold text-ink">{subtotal.toFixed(2)} ₪</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] text-mist">الخصم ({discountCode.toUpperCase()})</span>
            <span className="text-[13px] font-bold text-emerald-600">-{discountAmount.toFixed(2)} ₪</span>
          </div>
        )}
        <div className="h-px bg-border my-2" />
        <div className="flex items-center justify-between">
          <span className="font-display font-extrabold text-[14px] text-ink">المجموع الكلي</span>
          <span className="font-display font-black text-[18px] text-olive">{total.toFixed(2)} ₪</span>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-surface border border-border rounded-[14px] p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="text-[11px] font-bold text-ink mb-2">ملاحظات (اختياري)</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: بدون بصل، حار خفيف..."
          className="w-full bg-fog border-[1.5px] border-border rounded-[10px] px-3 py-2.5 text-[13px] text-ink outline-none resize-none h-[64px] focus:border-olive transition-colors"
          dir="rtl"
        />
      </div>

      {/* Customer info */}
      {!phoneVerified ? (
        <div className="bg-surface border border-border rounded-[14px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] text-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-olive mx-auto mb-2" fill="none" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <p className="text-[13px] font-bold text-ink mb-1">يجب تسجيل الدخول للطلب</p>
          <p className="text-[11px] text-mist mb-3">سجّل دخولك برقم الواتساب حتى يتمكن المطعم من التواصل معك</p>
          <button
            onClick={() => onRequireLogin?.()}
            className="w-full py-3 rounded-[12px] bg-[#25D366] text-white font-display font-bold text-[13px] flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            تسجيل الدخول
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[14px] p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] font-bold text-ink mb-1.5 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] stroke-olive" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            بيانات التواصل
          </div>
          <div className="text-[10px] text-mist mb-2.5">سيتواصل معك المطعم عبر واتساب على هذا الرقم</div>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل *"
              className="w-full bg-fog border-[1.5px] border-border rounded-[10px] px-3 py-2.5 text-[13px] text-ink outline-none focus:border-olive transition-colors"
              dir="rtl"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(normalizeDigits(e.target.value))}
              placeholder="رقم الواتساب *"
              type="tel"
              inputMode="tel"
              className="w-full bg-fog border-[1.5px] border-border rounded-[10px] px-3 py-2.5 text-[13px] text-ink outline-none focus:border-olive transition-colors"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

      {/* Submit */}
      {phoneVerified && (
        <button
          onClick={submitOrder}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] bg-olive text-white font-display font-extrabold text-[15px] shadow-[0_4px_16px_rgba(74,124,89,0.3)] disabled:opacity-50 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-white" fill="none" strokeWidth="2" strokeLinecap="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {submitting ? "جاري الإرسال..." : `إرسال الطلب — ${total.toFixed(2)} ₪`}
        </button>
      )}
    </div>
  );
}

/** Floating cart FAB shown at bottom of page */
export function CartBar({ itemCount, total, onClick }: { itemCount: number; total: number; onClick: () => void }) {
  if (itemCount === 0) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 bg-olive text-white rounded-full shadow-[0_4px_18px_rgba(74,124,89,0.35)] flex items-center gap-2 px-5 py-3 whitespace-nowrap lg:bottom-4"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      <span className="font-display font-extrabold text-[13px]">عرض السلة</span>
      <div className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-extrabold">
        {itemCount}
      </div>
      <span className="text-[12px] opacity-85">— {total.toFixed(0)} ₪</span>
    </button>
  );
}

/** Order status badge */
export function OrderStatusBadge({ status }: { status: string }) {
  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-amber-100 text-amber-800" },
    accepted: { label: "تم القبول", color: "bg-blue-100 text-blue-800" },
    preparing: { label: "جاري التحضير", color: "bg-violet-100 text-violet-800" },
    ready: { label: "جاهز للاستلام", color: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "مرفوض", color: "bg-red-100 text-red-700" },
    cancelled: { label: "ملغي", color: "bg-gray-100 text-gray-600" },
  };
  const st = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.color}`}>
      {st.label}
    </span>
  );
}
