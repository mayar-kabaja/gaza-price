"use client";

import { useState, useMemo, useEffect, useRef } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  { value: "cancelled", label: "ملغي" },
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
  lastEvent?: { type: "order_created" | "order_updated"; order: any } | null;
}

export function DashboardOrders({ token, ordersEnabled, onToggleOrders, lastEvent }: Props) {
  const [filter, setFilter] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["dashboard-orders", token], [token]);

  const [newOrderFlash, setNewOrderFlash] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiFetch(`/api/places/dashboard/orders?token=${token}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 30000,
    enabled: ordersEnabled,
  });

  // Handle SSE events from parent (DashboardNotifications owns the SSE connection)
  const lastProcessedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastEvent) return;
    const eventKey = `${lastEvent.order.id}-${lastEvent.order.status}`;
    if (lastProcessedRef.current === eventKey) return;
    lastProcessedRef.current = eventKey;

    if (lastEvent.type === "order_created") {
      const order = lastEvent.order as Order;
      queryClient.setQueryData<Order[]>(queryKey, (old = []) => {
        if (old.some((o) => o.id === order.id)) return old;
        return [order, ...old];
      });
      setNewOrderFlash(order.id);
      setTimeout(() => setNewOrderFlash(null), 3000);
      try { new Audio("/sounds/order-notify.wav").play().catch(() => {}); } catch {}
    } else {
      const order = lastEvent.order as Order;
      queryClient.setQueryData<Order[]>(queryKey, (old = []) =>
        old.map((o) => (o.id === order.id ? order : o)),
      );
    }
  }, [lastEvent, queryClient, queryKey]);

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: string; status: string; reason?: string }) => {
      await apiFetch(`/api/places/dashboard/orders/${orderId}/status?token=${token}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reject_reason: reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setRejectId(null);
      setRejectReason("");
    },
  });

  // Client-side filtering — instant
  const filtered = useMemo(
    () => (filter ? orders.filter((o) => o.status === filter) : orders),
    [orders, filter]
  );

  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);

  return (
    <div className="space-y-3">
      {/* Toggle + header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display font-bold text-[14px] text-[var(--d-text)]">الطلبات</h3>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingCount} بانتظار</span>
          )}
        </div>
        <button
          onClick={onToggleOrders}
          className={`relative w-10 h-[22px] rounded-full transition-colors ${ordersEnabled ? "bg-[var(--d-green)]" : "bg-[var(--d-border)]"}`}
        >
          <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${ordersEnabled ? "right-[3px]" : "right-[21px]"}`} />
        </button>
      </div>

      {!ordersEnabled && (
        <div className="text-center py-5 text-[var(--d-text-muted)] text-[11px]">
          فعّل استقبال الطلبات ليتمكن الزبائن من الطلب
        </div>
      )}

      {ordersEnabled && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  filter === tab.value ? "bg-[var(--d-green)] text-white" : "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-[var(--d-border)]/30 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-6 text-[var(--d-text-muted)] text-[12px]">لا توجد طلبات</div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((order) => {
                const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
                const isUpdating = updateMutation.isPending && updateMutation.variables?.orderId === order.id;
                return (
                  <div key={order.id} className={`border rounded-xl overflow-hidden transition-all duration-500 ${isUpdating ? "opacity-50 pointer-events-none" : ""} ${newOrderFlash === order.id ? "border-amber-400 ring-2 ring-amber-300/50 animate-pulse" : "border-[var(--d-border)]"}`}>
                    {/* Header row */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--d-subtle-bg)]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[12px] text-[var(--d-text)]">#{order.order_number}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-[1px] rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <span className="text-[9px] text-[var(--d-text-muted)]">{timeAgo(order.created_at)}</span>
                    </div>

                    <div className="px-3 py-2 space-y-1.5">
                      {/* Customer */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-[var(--d-text)]">{order.customer_name}</span>
                        <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-[#25D366] font-bold flex items-center gap-0.5" dir="ltr">
                          <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-[#25D366] inline" fill="none" strokeWidth="2.5" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                          {order.customer_phone}
                        </a>
                      </div>

                      {/* Items */}
                      <div className="space-y-0.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-[10px]">
                            <span className="text-[var(--d-text-muted)]">{item.item_name} <span className="text-[var(--d-text)]">×{item.quantity}</span></span>
                            <span className="text-[var(--d-text-muted)] tabular-nums">₪{(item.item_price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--d-border)]">
                        <span className="text-[10px] font-bold text-[var(--d-text)]">المجموع</span>
                        <span className="text-[11px] font-bold text-[var(--d-green)] tabular-nums">₪{Number(order.total).toFixed(2)}</span>
                      </div>
                      {Number(order.discount_amount) > 0 && (
                        <div className="text-[9px] text-[var(--d-green)]">خصم: -₪{Number(order.discount_amount).toFixed(2)}</div>
                      )}

                      {order.note && (
                        <div className="text-[9px] text-[var(--d-text-muted)] bg-[var(--d-subtle-bg)] rounded px-2 py-1">📝 {order.note}</div>
                      )}

                      {order.reject_reason && (
                        <div className="text-[9px] text-red-500">سبب الرفض: {order.reject_reason}</div>
                      )}

                      {/* Actions */}
                      {order.status === "pending" && (
                        <div className="flex gap-1.5 pt-0.5 justify-end">
                          <button
                            onClick={() => updateMutation.mutate({ orderId: order.id, status: "accepted" })}
                            disabled={isUpdating}
                            className="px-3 py-1 rounded-md bg-[var(--d-green)] text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => setRejectId(order.id)}
                            disabled={isUpdating}
                            className="px-3 py-1 rounded-md text-red-500 border border-red-200 text-[10px] font-bold disabled:opacity-50"
                          >
                            رفض
                          </button>
                        </div>
                      )}
                      {order.status === "accepted" && (
                        <div className="flex justify-end pt-0.5">
                          <button
                            onClick={() => updateMutation.mutate({ orderId: order.id, status: "preparing" })}
                            disabled={isUpdating}
                            className="px-3 py-1 rounded-md bg-violet-500 text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            بدء التحضير
                          </button>
                        </div>
                      )}
                      {order.status === "preparing" && (
                        <div className="flex justify-end pt-0.5">
                          <button
                            onClick={() => updateMutation.mutate({ orderId: order.id, status: "ready" })}
                            disabled={isUpdating}
                            className="px-3 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            جاهز للاستلام
                          </button>
                        </div>
                      )}

                      {/* Reject reason */}
                      {rejectId === order.id && (
                        <div className="space-y-1.5 pt-1.5 border-t border-[var(--d-border)]">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="سبب الرفض (اختياري)"
                            className="w-full border border-[var(--d-border)] rounded-md px-2 py-1 text-[10px] bg-[var(--d-subtle-bg)] text-[var(--d-text)]"
                            dir="rtl"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => updateMutation.mutate({ orderId: order.id, status: "rejected", reason: rejectReason })}
                              disabled={isUpdating}
                              className="px-3 py-1 rounded-md bg-red-500 text-white text-[10px] font-bold disabled:opacity-50"
                            >
                              تأكيد الرفض
                            </button>
                            <button
                              onClick={() => { setRejectId(null); setRejectReason(""); }}
                              className="px-3 py-1 rounded-md bg-[var(--d-subtle-bg)] border border-[var(--d-border)] text-[var(--d-text)] text-[10px] font-bold"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
