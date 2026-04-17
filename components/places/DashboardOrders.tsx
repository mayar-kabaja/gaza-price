"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/fetch";

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  status: string;
  note: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  reject_reason: string | null;
  items: OrderItem[];
  created_at: string;
}

const STATUS_TABS = [
  { value: "", label: "الكل" },
  { value: "pending", label: "بانتظار" },
  { value: "accepted", label: "مقبول" },
  { value: "preparing", label: "تحضير" },
  { value: "ready", label: "جاهز" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار", cls: "bg-amber-100 text-amber-800" },
  accepted: { label: "مقبول", cls: "bg-blue-100 text-blue-800" },
  preparing: { label: "تحضير", cls: "bg-violet-100 text-violet-800" },
  ready: { label: "جاهز", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "ملغي", cls: "bg-gray-100 text-gray-600" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  return `${Math.floor(hrs / 24)} ي`;
}

interface Props {
  token: string;
  ordersEnabled: boolean;
  onToggleOrders: () => void;
}

export function DashboardOrders({ token, ordersEnabled, onToggleOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const qs = filter ? `&status=${filter}` : "";
      const res = await apiFetch(`/api/places/dashboard/orders?token=${token}${qs}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
      }
    } catch {}
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15s
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function updateStatus(orderId: string, status: string, reason?: string) {
    setUpdating(orderId);
    try {
      const res = await apiFetch(`/api/places/dashboard/orders/${orderId}/status?token=${token}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reject_reason: reason }),
      });
      if (res.ok) {
        await load();
        setRejectId(null);
        setRejectReason("");
      }
    } catch {}
    setUpdating(null);
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Toggle + header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-[14px] text-ink">الطلبات</h3>
          {pendingCount > 0 && (
            <span className="text-[11px] text-amber-600 font-bold">{pendingCount} طلب بانتظار</span>
          )}
        </div>
        <button
          onClick={onToggleOrders}
          className={`relative w-11 h-6 rounded-full transition-colors ${ordersEnabled ? "bg-olive" : "bg-border"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ordersEnabled ? "right-0.5" : "right-[22px]"}`} />
        </button>
      </div>

      {!ordersEnabled && (
        <div className="text-center py-6 text-mist text-[12px]">
          فعّل استقبال الطلبات ليتمكن الزبائن من الطلب
        </div>
      )}

      {ordersEnabled && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  filter === tab.value ? "bg-olive text-white" : "bg-fog text-mist border border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-border/40 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div className="text-center py-8 text-mist text-[13px]">لا توجد طلبات</div>
          )}

          {!loading && orders.map((order) => {
            const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
            return (
              <div key={order.id} className="bg-surface border border-border rounded-xl p-3 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-[15px] text-ink">#{order.order_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <span className="text-[10px] text-mist">{timeAgo(order.created_at)}</span>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-2 text-[12px] text-ink">
                  <span className="font-semibold">{order.customer_name}</span>
                  <a href={`tel:${order.customer_phone}`} className="text-olive font-bold" dir="ltr">{order.customer_phone}</a>
                </div>

                {/* Items */}
                <div className="bg-fog rounded-lg p-2 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-ink">{item.item_name} × {item.quantity}</span>
                      <span className="text-mist font-bold">₪{(item.item_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between text-[13px] font-bold">
                  <span className="text-ink">المجموع</span>
                  <span className="text-olive">₪{Number(order.total).toFixed(2)}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="text-[11px] text-olive">خصم: -₪{Number(order.discount_amount).toFixed(2)}</div>
                )}

                {order.note && (
                  <div className="text-[11px] text-mist bg-fog rounded-lg p-2">📝 {order.note}</div>
                )}

                {order.reject_reason && (
                  <div className="text-[11px] text-red-500">سبب الرفض: {order.reject_reason}</div>
                )}

                {/* Actions */}
                {order.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(order.id, "accepted")}
                      disabled={updating === order.id}
                      className="flex-1 py-2 rounded-lg bg-olive text-white text-[12px] font-bold disabled:opacity-50"
                    >
                      قبول ✓
                    </button>
                    <button
                      onClick={() => setRejectId(order.id)}
                      disabled={updating === order.id}
                      className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[12px] font-bold disabled:opacity-50"
                    >
                      رفض ✕
                    </button>
                  </div>
                )}
                {order.status === "accepted" && (
                  <button
                    onClick={() => updateStatus(order.id, "preparing")}
                    disabled={updating === order.id}
                    className="w-full py-2 rounded-lg bg-violet-500 text-white text-[12px] font-bold disabled:opacity-50"
                  >
                    بدء التحضير 🍳
                  </button>
                )}
                {order.status === "preparing" && (
                  <button
                    onClick={() => updateStatus(order.id, "ready")}
                    disabled={updating === order.id}
                    className="w-full py-2 rounded-lg bg-emerald-500 text-white text-[12px] font-bold disabled:opacity-50"
                  >
                    جاهز للاستلام ✓
                  </button>
                )}

                {/* Reject reason modal */}
                {rejectId === order.id && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض (اختياري)"
                      className="w-full border border-border rounded-lg px-3 py-2 text-[12px] bg-fog text-ink"
                      dir="rtl"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, "rejected", rejectReason)}
                        disabled={updating === order.id}
                        className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[12px] font-bold disabled:opacity-50"
                      >
                        تأكيد الرفض
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setRejectReason(""); }}
                        className="flex-1 py-2 rounded-lg bg-fog border border-border text-ink text-[12px] font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
