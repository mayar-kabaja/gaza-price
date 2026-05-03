"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

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
  { value: "today", label: "اليوم" },
  { value: "pending", label: "بانتظار" },
  { value: "accepted", label: "مقبول" },
  { value: "preparing", label: "تحضير" },
  { value: "ready", label: "جاهز" },
  { value: "cancelled", label: "ملغي" },
];

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  pending:   { label: "بانتظار", cls: "bg-amber-500/10 text-amber-600 border border-amber-500/20", dot: "bg-amber-400" },
  accepted:  { label: "مقبول",   cls: "bg-blue-500/10 text-blue-600 border border-blue-500/20", dot: "bg-blue-400" },
  preparing: { label: "تحضير",   cls: "bg-blue-500/10 text-blue-600 border border-blue-500/20", dot: "bg-blue-500" },
  ready:     { label: "جاهز",    cls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20", dot: "bg-emerald-400" },
  rejected:  { label: "مرفوض",   cls: "bg-red-500/10 text-red-500 border border-red-500/20", dot: "bg-red-400" },
  cancelled: { label: "ملغي",    cls: "bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] border border-[var(--d-border)]", dot: "bg-gray-400" },
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", { weekday: "short", month: "short", day: "numeric" });
}

interface Props {
  token: string;
  ordersEnabled: boolean;
  onToggleOrders: () => void | Promise<void>;
  lastEvent?: { type: "order_created" | "order_updated"; order: any } | null;
  mobile?: boolean;
}

const ORDERS_PER_PAGE = 12;

export function DashboardOrders({ token, ordersEnabled, onToggleOrders, lastEvent, mobile }: Props) {
  const [filter, setFilter] = useState("");
  const [mobileMode, setMobileMode] = useState<"today" | "history">("today");
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["dashboard-orders", token], [token]);
  const [newOrderFlash, setNewOrderFlash] = useState<string | null>(null);
  const [togglingOrders, setTogglingOrders] = useState(false);

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

  const filtered = useMemo(() => {
    let base = orders;
    // On mobile, apply mobileMode first
    if (mobile && mobileMode === "today") {
      base = orders.filter((o) => isToday(o.created_at));
    }
    if (filter === "today") return base.filter((o) => isToday(o.created_at));
    if (filter) return base.filter((o) => o.status === filter);
    return base;
  }, [orders, filter, mobile, mobileMode]);

  const todayCount = useMemo(() => orders.filter((o) => isToday(o.created_at)).length, [orders]);

  const [mobileVisible, setMobileVisible] = useState(ORDERS_PER_PAGE);

  useEffect(() => { setPage(1); setMobileVisible(ORDERS_PER_PAGE); }, [filter, mobileMode]);

  const totalPages = Math.ceil(filtered.length / ORDERS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE),
    [filtered, page]
  );
  const mobileOrders = useMemo(
    () => filtered.slice(0, mobileVisible),
    [filtered, mobileVisible]
  );
  const hasMore = mobileVisible < filtered.length;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) {
      c[o.status] = (c[o.status] || 0) + 1;
      if (isToday(o.created_at)) c["today"] = (c["today"] || 0) + 1;
    }
    return c;
  }, [orders]);

  const pendingCount = counts["pending"] || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-[16px] text-[var(--d-text)]">
            {mobile && mobileMode === "today" ? "طلبات اليوم" : "الطلبات"}
          </h3>
          {pendingCount > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600">
              {pendingCount} بانتظار
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mobile && (
            <button
              onClick={() => { setMobileMode(mobileMode === "today" ? "history" : "today"); setFilter(""); }}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                mobileMode === "history"
                  ? "bg-[var(--d-green-bg)] text-[var(--d-green)] border border-[var(--d-green)]/30"
                  : "bg-[var(--d-card)] text-[var(--d-text-muted)] border border-[var(--d-border)]"
              }`}
            >
              {mobileMode === "today" ? "السجل ←" : "اليوم ←"}
            </button>
          )}
          <button
            onClick={async () => { setTogglingOrders(true); try { await onToggleOrders(); } finally { setTogglingOrders(false); } }}
            disabled={togglingOrders}
            className={`relative w-10 h-[22px] rounded-full transition-colors ${ordersEnabled ? "bg-[var(--d-green)]" : "bg-[var(--d-border)]"}`}
          >
            {togglingOrders ? (
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-3.5 h-3.5 border-[1.5px] border-white/50 border-t-white rounded-full animate-spin" /></div>
            ) : (
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${ordersEnabled ? "right-[3px]" : "right-[21px]"}`} />
            )}
          </button>
        </div>
      </div>

      {!ordersEnabled && (
        <div className="text-center py-5 text-[var(--d-text-muted)] text-[11px]">
          فعّل استقبال الطلبات ليتمكن الزبائن من الطلب
        </div>
      )}

      {ordersEnabled && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUS_TABS
              .filter((tab) => !(mobile && mobileMode === "today" && tab.value === "today"))
              .map((tab) => {
              const count = tab.value ? (counts[tab.value] || 0) : (mobile && mobileMode === "today" ? todayCount : orders.length);
              const isActive = filter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? "border border-[var(--d-green)]/30 bg-[var(--d-green-bg)] text-[var(--d-green)]"
                      : "bg-[var(--d-card)] text-[var(--d-text-muted)] border border-[var(--d-border)] hover:border-[var(--d-green)]/30"
                  }`}
                >
                  {tab.label}{count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          {isLoading && (
            mobile ? (
              <div className="flex gap-3 overflow-hidden">
                {[1, 2].map((i) => (
                  <div key={i} className="h-[340px] w-[85vw] max-w-[320px] shrink-0 rounded-2xl bg-[var(--d-border)]/20 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[340px] rounded-2xl bg-[var(--d-border)]/20 animate-pulse" />
                ))}
              </div>
            )
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 text-[var(--d-text-muted)] text-[12px]">
              {mobile && mobileMode === "today" ? "لا توجد طلبات اليوم" : "لا توجد طلبات"}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <>
            {/* Mobile: horizontal slider / Desktop: grid */}
            <OrderCards
              orders={mobile ? mobileOrders : paginated}
              mobile={mobile}
              rejectId={rejectId}
              setRejectId={setRejectId}
              rejectReason={rejectReason}
              setRejectReason={setRejectReason}
              updateMutation={updateMutation}
              newOrderFlash={newOrderFlash}
              hasMore={mobile ? hasMore : false}
              onLoadMore={() => setMobileVisible((v) => v + ORDERS_PER_PAGE)}
              onSelect={setSelectedOrder}
            />

            {!mobile && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-colors ${
                      p === page
                        ? "border border-[var(--d-green)]/30 bg-[var(--d-green-bg)] text-[var(--d-green)]"
                        : "text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            )}
            </>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          rejectId={rejectId}
          setRejectId={setRejectId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          updateMutation={updateMutation}
        />
      )}
    </div>
  );
}

/* ── Order Detail Modal ── */
function OrderDetailModal({ order, onClose, rejectId, setRejectId, rejectReason, setRejectReason, updateMutation }: {
  order: Order;
  onClose: () => void;
  rejectId: string | null;
  setRejectId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  updateMutation: any;
}) {
  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
  const isUpdating = updateMutation.isPending && updateMutation.variables?.orderId === order.id;
  const isDead = order.status === "cancelled" || order.status === "rejected";
  const itemsTotal = order.items.reduce((sum, i) => sum + i.item_price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-end lg:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Modal */}
      <div
        className="relative w-full max-w-[480px] max-h-[90vh] bg-[var(--d-card)] rounded-t-3xl lg:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--d-border)]" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-[var(--d-border)]/60">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[var(--d-green-bg)] flex items-center justify-center text-[14px] font-bold text-[var(--d-green)]">
                {order.customer_name.slice(0, 2)}
              </div>
              <div>
                <div className="font-bold text-[15px] text-[var(--d-text)]">{order.customer_name}</div>
                <div className="text-[11px] text-[var(--d-text-muted)] mt-0.5">طلب #{order.order_number}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--d-subtle-bg)] flex items-center justify-center text-[var(--d-text-muted)] hover:bg-[var(--d-border)] transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Date & Contact */}
          <div className="flex items-center justify-between mt-3 text-[11px] text-[var(--d-text-muted)]">
            <div className="flex items-center gap-2">
              {isToday(order.created_at) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">اليوم</span>
              )}
              <span>{formatDate(order.created_at)} · {formatTime(order.created_at)}</span>
            </div>
            <a
              href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-bold text-[#25D366] hover:underline"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.359 0-4.543-.804-6.271-2.152l-.438-.362-2.633.883.883-2.633-.362-.438A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              {order.customer_phone}
            </a>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
          <div className="text-[10px] font-bold text-[var(--d-text-muted)] uppercase tracking-wider mb-2">الأصناف ({order.items.length})</div>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[var(--d-green-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--d-green)] shrink-0">
                    x{item.quantity}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--d-text)] truncate">{item.item_name}</span>
                </div>
                <span className="text-[12px] font-bold text-[var(--d-text)] tabular-nums shrink-0" dir="ltr">₪{(item.item_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          {order.note && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <div className="text-[10px] font-bold text-amber-600 mb-1">ملاحظة</div>
              <div className="text-[11px] text-[var(--d-text)]">{order.note}</div>
            </div>
          )}

          {/* Reject reason */}
          {order.reject_reason && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
              <div className="text-[10px] font-bold text-red-500 mb-1">سبب الرفض</div>
              <div className="text-[11px] text-[var(--d-text)]">{order.reject_reason}</div>
            </div>
          )}
        </div>

        {/* Totals + Actions */}
        <div className="px-5 py-4 border-t border-[var(--d-border)]/60">
          {/* Totals */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--d-text-muted)]">المجموع الفرعي</span>
              <span className="text-[var(--d-text)] tabular-nums" dir="ltr">₪{Number(order.subtotal).toFixed(2)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-500">الخصم</span>
                <span className="text-emerald-500 tabular-nums" dir="ltr">-₪{Number(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[14px] font-bold pt-1.5 border-t border-dashed border-[var(--d-border)]/60">
              <span className="text-[var(--d-text)]">الإجمالي</span>
              <span className="text-[var(--d-green)] tabular-nums" dir="ltr">₪{Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Action buttons */}
          {!isDead && (
            <div className="space-y-2">
              {order.status === "pending" && rejectId !== order.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ orderId: order.id, status: "accepted" })}
                    disabled={isUpdating}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--d-green)] text-white text-[12px] font-bold disabled:opacity-50 transition-colors"
                  >
                    قبول الطلب
                  </button>
                  <button
                    onClick={() => setRejectId(order.id)}
                    disabled={isUpdating}
                    className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-500 text-[12px] font-bold disabled:opacity-50 transition-colors"
                  >
                    رفض
                  </button>
                </div>
              )}
              {order.status === "pending" && rejectId === order.id && (
                <div className="space-y-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="سبب الرفض (اختياري)"
                    className="w-full rounded-xl border border-[var(--d-border)] px-3 py-2.5 text-[12px] bg-[var(--d-subtle-bg)] text-[var(--d-text)] focus:outline-none focus:border-red-300 placeholder:text-[var(--d-text-muted)]"
                    dir="rtl"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate({ orderId: order.id, status: "rejected", reason: rejectReason })}
                      disabled={isUpdating}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[12px] font-bold disabled:opacity-50"
                    >
                      تأكيد الرفض
                    </button>
                    <button
                      onClick={() => { setRejectId(null); setRejectReason(""); }}
                      className="flex-1 py-2.5 rounded-xl bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)] text-[12px] font-bold"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
              {order.status === "accepted" && (
                <button
                  onClick={() => updateMutation.mutate({ orderId: order.id, status: "preparing" })}
                  disabled={isUpdating}
                  className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-[12px] font-bold disabled:opacity-50 transition-colors"
                >
                  بدء التحضير
                </button>
              )}
              {order.status === "preparing" && (
                <button
                  onClick={() => updateMutation.mutate({ orderId: order.id, status: "ready" })}
                  disabled={isUpdating}
                  className="w-full py-2.5 rounded-xl bg-[var(--d-green)] text-white text-[12px] font-bold disabled:opacity-50 transition-colors"
                >
                  جاهز للاستلام
                </button>
              )}
              {order.status === "ready" && (
                <div className="text-center py-2 text-[12px] font-bold text-emerald-500">✓ الطلب جاهز للاستلام</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Order Cards: slider (mobile) or grid (desktop) ── */
function OrderCards({ orders, mobile, rejectId, setRejectId, rejectReason, setRejectReason, updateMutation, newOrderFlash, hasMore, onLoadMore, onSelect }: {
  orders: Order[];
  mobile?: boolean;
  rejectId: string | null;
  setRejectId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  updateMutation: any;
  newOrderFlash: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelect?: (order: Order) => void;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 280;
    const gap = 12;
    const idx = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveSlide(idx);
  }, []);

  // Auto-load more when the "load more" card scrolls into view
  useEffect(() => {
    if (!mobile || !hasMore || !onLoadMore || !loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { root: sliderRef.current, threshold: 0.5 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [mobile, hasMore, onLoadMore]);

  if (mobile) {
    const totalSlides = orders.length + (hasMore ? 1 : 0);
    return (
      <div className="space-y-3">
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {orders.map((order) => (
            <div key={order.id} className="w-[85vw] max-w-[320px] shrink-0 snap-center">
              <OrderCard
                order={order}
                rejectId={rejectId}
                setRejectId={setRejectId}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                updateMutation={updateMutation}
                newOrderFlash={newOrderFlash}
                onSelect={onSelect}
              />
            </div>
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="w-[85vw] max-w-[320px] shrink-0 snap-center flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[var(--d-text-muted)]">
                <div className="w-8 h-8 border-2 border-[var(--d-border)] border-t-[var(--d-green)] rounded-full animate-spin" />
                <span className="text-[11px] font-bold">جاري التحميل...</span>
              </div>
            </div>
          )}
        </div>
        {/* Dots indicator */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: Math.min(totalSlides, 8) }, (_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === activeSlide ? "w-5 h-1.5 bg-[var(--d-green)]" : "w-1.5 h-1.5 bg-[var(--d-border)]"
                }`}
              />
            ))}
            {totalSlides > 8 && <span className="text-[9px] text-[var(--d-text-muted)] mr-1">+{totalSlides - 8}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          rejectId={rejectId}
          setRejectId={setRejectId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          updateMutation={updateMutation}
          newOrderFlash={newOrderFlash}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/* ── Single Order Card ── */
function OrderCard({ order, rejectId, setRejectId, rejectReason, setRejectReason, updateMutation, newOrderFlash, onSelect }: {
  order: Order;
  rejectId: string | null;
  setRejectId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  updateMutation: any;
  newOrderFlash: string | null;
  onSelect?: (order: Order) => void;
}) {
  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
  const isUpdating = updateMutation.isPending && updateMutation.variables?.orderId === order.id;
  const isDead = order.status === "cancelled" || order.status === "rejected";

  return (
    <div
      onClick={() => onSelect?.(order)}
      className={`h-[340px] flex flex-col rounded-2xl border bg-[var(--d-card)] transition-all duration-500 cursor-pointer ${
        isUpdating ? "opacity-50 pointer-events-none" : ""
      } ${
        newOrderFlash === order.id
          ? "border-amber-400 ring-2 ring-amber-200/30 shadow-lg"
          : isDead
            ? "border-[var(--d-border)] opacity-70"
            : "border-[var(--d-border)] shadow-sm hover:shadow-md"
      }`}
    >
      {/* ── Card header ── */}
      <div className={`px-4 pt-4 pb-3 border-b border-[var(--d-border)]/60 ${isDead ? "opacity-50" : ""}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--d-green-bg)] flex items-center justify-center text-[12px] font-bold text-[var(--d-green)] shrink-0">
              {order.customer_name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[13px] text-[var(--d-text)] truncate">{order.customer_name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[var(--d-text-muted)]">طلب #{order.order_number}</span>
                <span className="text-[10px] text-[var(--d-text-muted)]">·</span>
                <a
                  href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[var(--d-text-muted)] hover:text-[#25D366] transition-colors"
                  dir="ltr"
                >
                  {order.customer_phone}
                </a>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--d-text-muted)]">
          <div className="flex items-center gap-1.5">
            {isToday(order.created_at) && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">اليوم</span>
            )}
            <span>{formatDate(order.created_at)}</span>
          </div>
          <span>{formatTime(order.created_at)}</span>
        </div>
      </div>

      {/* ── Items ── */}
      <div className={`flex-1 min-h-0 overflow-hidden ${isDead ? "opacity-40" : ""}`}>
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5 text-[9px] font-semibold text-[var(--d-text-muted)] uppercase tracking-wide">
          <span>الصنف</span>
          <div className="flex gap-6">
            <span className="w-6 text-center">الكمية</span>
            <span className="w-14 text-left">السعر</span>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(100%-28px)] px-4 space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-[var(--d-text)] truncate flex-1 ml-3">{item.item_name}</span>
              <div className="flex gap-6 shrink-0">
                <span className="w-6 text-center text-[var(--d-text-muted)]">{item.quantity}</span>
                <span className="w-14 text-left tabular-nums text-[var(--d-text)]">₪{(item.item_price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Note ── */}
      {order.note && (
        <div className={`px-4 py-1.5 text-[9px] text-[var(--d-text-muted)] border-t border-dashed border-[var(--d-border)]/60 ${isDead ? "opacity-40" : ""}`}>
          📝 {order.note}
        </div>
      )}

      {/* ── Reject reason ── */}
      {order.reject_reason && (
        <div className="px-4 py-1.5 text-[9px] text-red-500 bg-red-500/5">
          سبب الرفض: {order.reject_reason}
        </div>
      )}

      {/* ── Footer ── */}
      <div className={`px-4 py-2.5 border-t border-[var(--d-border)]/60 ${isDead ? "opacity-50" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[14px] font-bold text-[var(--d-text)] tabular-nums">₪{Number(order.total).toFixed(2)}</span>
            {Number(order.discount_amount) > 0 && (
              <span className="text-[9px] text-emerald-500 font-medium mr-1">(-₪{Number(order.discount_amount).toFixed(2)})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {order.status === "pending" && rejectId !== order.id && (
              <>
                <button
                  onClick={() => updateMutation.mutate({ orderId: order.id, status: "accepted" })}
                  disabled={isUpdating}
                  className="px-3 py-1 rounded-lg border border-[var(--d-green)]/30 bg-[var(--d-green-bg)] text-[var(--d-green)] text-[10px] font-bold hover:bg-[var(--d-green-bg-hover)] transition-colors disabled:opacity-50"
                >
                  قبول
                </button>
                <button
                  onClick={() => setRejectId(order.id)}
                  disabled={isUpdating}
                  className="px-3 py-1 rounded-lg border border-red-500/20 bg-[var(--d-card)] text-red-500 text-[10px] font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  رفض
                </button>
              </>
            )}
            {order.status === "accepted" && (
              <button
                onClick={() => updateMutation.mutate({ orderId: order.id, status: "preparing" })}
                disabled={isUpdating}
                className="px-3 py-1 rounded-lg border border-blue-500/20 bg-[var(--d-card)] text-blue-600 text-[10px] font-bold hover:bg-blue-500/10 transition-colors disabled:opacity-50"
              >
                بدء التحضير
              </button>
            )}
            {order.status === "preparing" && (
              <button
                onClick={() => updateMutation.mutate({ orderId: order.id, status: "ready" })}
                disabled={isUpdating}
                className="px-3 py-1 rounded-lg border border-[var(--d-green)]/30 bg-[var(--d-green-bg)] text-[var(--d-green)] text-[10px] font-bold hover:bg-[var(--d-green-bg-hover)] transition-colors disabled:opacity-50"
              >
                جاهز
              </button>
            )}
            {order.status === "ready" && (
              <span className="text-[10px] font-bold text-emerald-500">✓ جاهز</span>
            )}
          </div>
        </div>
        {rejectId === order.id && (
          <div className="flex items-center gap-2 mt-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="سبب الرفض (اختياري)"
              className="flex-1 rounded-lg border border-[var(--d-border)] px-2.5 py-1 text-[10px] bg-transparent text-[var(--d-text)] focus:outline-none focus:border-red-300 placeholder:text-[var(--d-text-muted)]"
              dir="rtl"
            />
            <button
              onClick={() => updateMutation.mutate({ orderId: order.id, status: "rejected", reason: rejectReason })}
              disabled={isUpdating}
              className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold disabled:opacity-50"
            >
              تأكيد
            </button>
            <button
              onClick={() => { setRejectId(null); setRejectReason(""); }}
              className="px-2 py-1 text-[var(--d-text-muted)] text-[10px] font-bold"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
