"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { useIsDesktop } from "@/hooks/useIsDesktop";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-EG", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
}

interface MyOrder {
  id: string;
  order_number: number;
  status: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  note: string | null;
  reject_reason: string | null;
  items: OrderItem[];
  created_at: string;
  place_id: string;
  place_name: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  pending:   { label: "بانتظار", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20", dot: "bg-amber-400" },
  accepted:  { label: "مقبول",   cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20", dot: "bg-blue-400" },
  preparing: { label: "تحضير",   cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20", dot: "bg-violet-500" },
  ready:     { label: "جاهز",    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-400" },
  rejected:  { label: "مرفوض",   cls: "bg-red-500/10 text-red-500 border border-red-500/20", dot: "bg-red-400" },
  cancelled: { label: "ملغي",    cls: "bg-gray-500/10 text-mist border border-border", dot: "bg-gray-400" },
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 10;

  const { data: orders = [], isLoading } = useQuery<MyOrder[]>({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const res = await apiFetch("/api/places/my-orders");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 5000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiFetch(`/api/places/orders/${orderId}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "تعذر الإلغاء");
      }
    },
    onMutate: async (orderId) => {
      const prev = queryClient.getQueryData<MyOrder[]>(["my-orders"]);
      queryClient.setQueryData<MyOrder[]>(["my-orders"], (old = []) =>
        old.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["my-orders"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  const todayOrders = useMemo(() => orders.filter((o) => isToday(o.created_at)), [orders]);
  const historyOrders = useMemo(() => orders.filter((o) => !isToday(o.created_at)), [orders]);
  const historyTotalPages = Math.ceil(historyOrders.length / HISTORY_PER_PAGE);
  const paginatedHistory = useMemo(() => historyOrders.slice(0, historyPage * HISTORY_PER_PAGE), [historyOrders, historyPage]);
  const displayOrders = showHistory ? paginatedHistory : todayOrders;

  function renderOrder(order: MyOrder) {
    const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
    const isCancelling = cancelMutation.isPending && cancelMutation.variables === order.id;
    const isDead = order.status === "cancelled" || order.status === "rejected";

    return (
      <div
        key={order.id}
        className={`flex flex-col rounded-2xl border bg-surface transition-all ${
          isCancelling ? "opacity-50 pointer-events-none" : ""
        } ${
          isDead
            ? "border-border opacity-70"
            : "border-border shadow-sm"
        }`}
      >
        {/* Card header */}
        <div className={`px-4 pt-4 pb-3 border-b border-border/60 ${isDead ? "opacity-50" : ""}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-olive/10 flex items-center justify-center text-[12px] font-bold text-olive shrink-0">
                {order.place_name ? order.place_name.slice(0, 2) : "#"}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[13px] text-ink truncate">{order.place_name || "طلب"}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-mist">طلب #{order.order_number}</span>
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-mist">
            <div className="flex items-center gap-1.5">
              {isToday(order.created_at) && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive/10 text-olive">اليوم</span>
              )}
              <span>{formatDate(order.created_at)}</span>
            </div>
            <span>{formatTime(order.created_at)}</span>
          </div>
        </div>

        {/* Items table */}
        <div className={`flex-1 min-h-0 overflow-hidden ${isDead ? "opacity-40" : ""}`}>
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5 text-[9px] font-semibold text-mist uppercase tracking-wide">
            <span>الصنف</span>
            <div className="flex gap-6">
              <span className="w-6 text-center">الكمية</span>
              <span className="w-14 text-left">السعر</span>
            </div>
          </div>
          <div className="px-4 space-y-1 pb-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="text-ink truncate flex-1 ml-3">{item.item_name}</span>
                <div className="flex gap-6 shrink-0">
                  <span className="w-6 text-center text-mist">{item.quantity}</span>
                  <span className="w-14 text-left tabular-nums text-ink">{(item.item_price * item.quantity).toFixed(2)} ₪</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        {order.note && (
          <div className={`px-4 py-1.5 text-[9px] text-mist border-t border-dashed border-border/60 ${isDead ? "opacity-40" : ""}`}>
            📝 {order.note}
          </div>
        )}

        {/* Reject reason */}
        {order.reject_reason && (
          <div className="px-4 py-1.5 text-[9px] text-red-500 bg-red-500/5">
            سبب الرفض: {order.reject_reason}
          </div>
        )}

        {/* Footer */}
        <div className={`px-4 py-2.5 border-t border-border/60 ${isDead ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[14px] font-bold text-ink tabular-nums">{Number(order.total).toFixed(2)} ₪</span>
              {Number(order.discount_amount) > 0 && (
                <span className="text-[9px] text-emerald-500 font-medium mr-1">(-{Number(order.discount_amount).toFixed(2)} ₪)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {order.status === "pending" && (
                <button
                  onClick={() => cancelMutation.mutate(order.id)}
                  disabled={isCancelling}
                  className="px-3 py-1 rounded-lg border border-red-500/20 bg-surface text-red-500 text-[10px] font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {isCancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
                </button>
              )}
              {order.status === "ready" && (
                <span className="text-[10px] font-bold text-emerald-500">✓ جاهز للاستلام</span>
              )}
              {order.status === "preparing" && (
                <span className="text-[10px] font-bold text-violet-500">قيد التحضير...</span>
              )}
              {order.status === "accepted" && (
                <span className="text-[10px] font-bold text-blue-500">تم القبول</span>
              )}
            </div>
          </div>
          {cancelMutation.isError && cancelMutation.variables === order.id && (
            <p className="text-[10px] text-red-500 mt-1">{(cancelMutation.error as Error).message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {!isDesktop && <AppHeader hideSearch />}

      <div className="min-h-screen bg-fog pb-20" dir="rtl">
        <div className="max-w-[700px] mx-auto px-4 py-4 space-y-4">
          {/* Page title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-olive/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <h1 className="font-display font-bold text-[18px] text-ink">طلباتي</h1>
          </div>

          {/* Today / History toggle */}
          {!isLoading && orders.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowHistory(false); setHistoryPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  !showHistory
                    ? "bg-olive/10 text-olive border border-olive/20"
                    : "bg-fog text-mist border border-border"
                }`}
              >
                اليوم {todayOrders.length > 0 && `(${todayOrders.length})`}
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  showHistory
                    ? "bg-olive/10 text-olive border border-olive/20"
                    : "bg-fog text-mist border border-border"
                }`}
              >
                السجل {historyOrders.length > 0 && `(${historyOrders.length})`}
              </button>
            </div>
          )}

          {/* Orders grid */}
          <div className="grid grid-cols-2 gap-3">
            {isLoading && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-52 rounded-2xl bg-border/30 animate-pulse" />
                ))}
              </>
            )}

            {!isLoading && orders.length === 0 && (
              <div className="col-span-2 text-center py-16">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-[14px] text-mist font-display">لا توجد طلبات بعد</p>
                <p className="text-[12px] text-mist/60 mt-1">عند طلبك من أي محل ستظهر طلباتك هنا</p>
              </div>
            )}

            {!isLoading && orders.length > 0 && displayOrders.length === 0 && (
              <div className="col-span-2 text-center py-10">
                <p className="text-[13px] text-mist">
                  {showHistory ? "لا توجد طلبات سابقة" : "لا توجد طلبات اليوم"}
                </p>
              </div>
            )}

            {!isLoading && displayOrders.map(renderOrder)}

            {!isLoading && showHistory && historyPage < historyTotalPages && (
              <div className="col-span-2 flex justify-center pt-2">
                <button
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="px-5 py-2 rounded-xl border border-border bg-surface text-[12px] font-bold text-mist hover:text-ink hover:border-olive/30 transition-colors"
                >
                  عرض المزيد ({historyOrders.length - historyPage * HISTORY_PER_PAGE} متبقي)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isDesktop && <BottomNav />}
    </>
  );
}
