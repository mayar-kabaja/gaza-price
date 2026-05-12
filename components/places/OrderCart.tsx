"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { normalizeDigits } from "@/lib/normalize-digits";

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
  userPhone?: string | null;
  userHandle?: string | null;
}

function stripEmojis(text: string): string {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").replace(/\s+/g, " ").trim();
}

export function OrderSheet({ placeId, placeWhatsapp, cart, onUpdateQty, onClear, onOrderPlaced, userPhone, userHandle }: OrderCartProps) {
  const [name, setName] = useState(userHandle || "");
  const [phone, setPhone] = useState(userPhone || "");

  useEffect(() => { if (userPhone && !phone) setPhone(userPhone); }, [userPhone]);
  useEffect(() => { if (userHandle && !name) setName(userHandle); }, [userHandle]);

  const [note, setNote] = useState("");
  const [dineIn, setDineIn] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
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
          note: [dineIn && tableNumber.trim() ? `طاولة رقم: ${tableNumber.trim()}` : '', note.trim()].filter(Boolean).join(' | ') || undefined,
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

  /* ── Cancelled view ── */
  if (placedOrder && cancelled) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h3 className="text-[16px] font-semibold text-ink mb-1">تم إلغاء الطلب</h3>
        <p className="text-[13px] text-mist mb-5">طلبك رقم #{placedOrder.order_number} تم إلغاؤه</p>
        <button onClick={onClear} className="w-full h-11 rounded-xl bg-fog text-mist text-[13px] font-medium">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  /* ── Success view ── */
  if (placedOrder) {
    const waNum = placeWhatsapp?.replace(/[^0-9]/g, "") || "";
    return (
      <div className="px-5 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-olive-pale flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-olive" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 className="text-[16px] font-semibold text-ink mb-1">تم إرسال طلبك!</h3>
        <p className="text-[13px] text-mist leading-relaxed mb-5">
          {dineIn && tableNumber.trim() ? `طلبك وصل للمطبخ — طاولة رقم ${tableNumber.trim()}` : "طلبك وصل وسيتواصلون معك قريبا لتأكيد الطلب"}
        </p>

        {dineIn && tableNumber.trim() ? (
          <div className="bg-olive-pale rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-[13px] text-olive">رقم الطاولة</span>
            <span className="text-[18px] font-semibold text-olive">{tableNumber.trim()}</span>
          </div>
        ) : (
          <div className="bg-olive-pale rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-[13px] text-olive">رقم الطلب</span>
            <span className="text-[18px] font-semibold text-olive">#{placedOrder.order_number}</span>
          </div>
        )}

        {waNum && (
          <a
            href={`https://wa.me/${waNum}?text=${encodeURIComponent(dineIn && tableNumber.trim() ? `مرحبا، أرسلت طلب من طاولة ${tableNumber.trim()} — رقم #${placedOrder.order_number}` : `مرحبا، أرسلت طلب رقم #${placedOrder.order_number}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] text-white text-[14px] font-medium mb-2.5"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            فتح واتساب المطعم
          </a>
        )}

        {placedOrder.status === "pending" && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="w-full h-11 rounded-xl border border-red-200 text-red-500 text-[13px] font-medium mb-2.5 disabled:opacity-50"
          >
            {cancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
          </button>
        )}

        {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}

        <button onClick={onClear} className="w-full h-11 rounded-xl bg-fog text-mist text-[13px] font-medium">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  /* ── Empty cart ── */
  if (items.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-fog flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-mist" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <p className="text-[14px] text-mist">السلة فارغة</p>
      </div>
    );
  }

  /* ── Cart + Checkout ── */
  return (
    <div dir="rtl">
      <div className="px-5 py-4 space-y-3">
        {/* Cart items */}
        {items.map((item) => (
          <div key={item.menu_item_id} className="flex items-center gap-3 p-3 bg-[var(--color-fog,#f8f8f8)] rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-ink mb-0.5 truncate">{stripEmojis(item.name)}</div>
              <div className="text-[13px] text-mist">{item.price.toFixed(2)} ₪ / وحدة</div>
            </div>
            <div className="flex items-center gap-1 bg-surface rounded-full p-1 border border-border/50 flex-shrink-0">
              <button
                onClick={() => onUpdateQty(item.menu_item_id, -1)}
                className="w-[26px] h-[26px] rounded-full bg-fog flex items-center justify-center text-mist"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span className="text-[13px] font-medium min-w-[18px] text-center text-ink">{item.quantity}</span>
              <button
                onClick={() => onUpdateQty(item.menu_item_id, 1)}
                className="w-[26px] h-[26px] rounded-full bg-olive flex items-center justify-center text-white"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>
        ))}

        {/* Discount code */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center px-3 bg-[var(--color-fog,#f8f8f8)] rounded-xl h-10">
            <input
              value={discountCode}
              onChange={(e) => { setDiscountCode(e.target.value); setDiscountResult(null); }}
              placeholder="كود الخصم"
              maxLength={20}
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink text-right"
              dir="ltr"
            />
          </div>
          <button
            onClick={validateDiscount}
            disabled={validatingCode || !discountCode.trim()}
            className="px-5 h-10 bg-olive text-white rounded-xl text-[13px] font-medium disabled:opacity-40"
          >
            {validatingCode ? "..." : "تطبيق"}
          </button>
        </div>
        {discountResult?.valid && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-[12px] font-medium text-emerald-800">
              خصم {discountResult.discount_type === "percentage" ? `${discountResult.discount_value}%` : `${discountResult.discount_value} ₪`} تم تطبيقه!
            </span>
          </div>
        )}
        {discountResult && !discountResult.valid && (
          <p className="text-[11px] text-red-500">{discountResult.message}</p>
        )}

        {/* Order summary */}
        <div className="bg-[var(--color-fog,#f8f8f8)] rounded-xl px-4 py-3.5">
          <div className="flex justify-between items-center text-[13px] text-mist mb-2">
            <span>المجموع الفرعي</span>
            <span>{subtotal.toFixed(2)} ₪</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-[13px] mb-2">
              <span className="text-mist">الخصم ({discountCode.toUpperCase()})</span>
              <span className="text-emerald-600 font-medium">-{discountAmount.toFixed(2)} ₪</span>
            </div>
          )}
          <div className="h-px bg-border/50 my-2.5" />
          <div className="flex justify-between items-baseline">
            <span className="text-[14px] font-medium text-ink">المجموع الكلي</span>
            <span className="text-[18px] font-medium text-olive">{total.toFixed(2)} ₪</span>
          </div>
        </div>

        {/* Dine-in toggle */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setDineIn(!dineIn); if (dineIn) setTableNumber(""); }}
            className="flex items-center gap-2.5 w-full"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${dineIn ? 'bg-olive border-olive' : 'border-border'}`}>
              {dineIn && (
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            <span className="text-[13px] font-medium text-ink">الطلب من داخل المحل</span>
          </button>
          {dineIn && (
            <input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="رقم الطاولة"
              inputMode="numeric"
              maxLength={5}
              className="w-full h-10 bg-[var(--color-fog,#f8f8f8)] border border-border/30 rounded-xl px-3 text-[13px] text-ink outline-none"
              dir="rtl"
            />
          )}
        </div>

        {/* Customer info */}
        <div className="space-y-2">
          <div className="text-[13px] font-medium text-ink mb-1">بيانات التواصل</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل *"
            className="w-full h-10 bg-[var(--color-fog,#f8f8f8)] border border-border/30 rounded-xl px-3 text-[13px] text-ink outline-none"
            dir="rtl"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(normalizeDigits(e.target.value))}
            placeholder="رقم الواتساب *"
            type="tel"
            inputMode="tel"
            className="w-full h-10 bg-[var(--color-fog,#f8f8f8)] border border-border/30 rounded-xl px-3 text-[13px] text-ink outline-none text-right"
            dir="rtl"
          />
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-ink">ملاحظات للمطعم</span>
            <span className="text-[12px] text-mist/60">اختياري</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: بدون بصل، حار خفيف..."
            className="w-full min-h-[60px] p-3 bg-[var(--color-fog,#f8f8f8)] border border-border/30 rounded-xl text-[13px] text-ink outline-none resize-none"
            dir="rtl"
          />
        </div>

        {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

        {/* Submit */}
        <button
          onClick={submitOrder}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-olive text-white text-[14px] font-medium flex items-center justify-center disabled:opacity-50"
        >
          {submitting ? "جاري الإرسال..." : `إرسال الطلب — ${total.toFixed(2)} ₪`}
        </button>
      </div>
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
      <div className="w-5 h-5 rounded-full bg-white/25 text-white flex items-center justify-center text-[11px] font-extrabold">
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
