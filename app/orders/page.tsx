"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useGlobalSidebar } from "@/components/layout/GlobalDesktopShell";
import Link from "next/link";

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

  useGlobalSidebar(
    isDesktop ? (
      <div className="space-y-3">
        <Link href="/places" className="flex items-center gap-1.5 text-xs text-mist hover:text-olive transition-colors font-semibold mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          العودة للمحلات
        </Link>

        <div className="bg-olive-pale rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-olive/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <span className="font-display font-bold text-sm text-ink">طلباتي</span>
          </div>
        </div>

        <button
          onClick={() => { setShowHistory(false); setHistoryPage(1); }}
          className={`w-full text-right px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
            !showHistory ? "bg-olive/10 text-olive" : "text-mist hover:bg-fog"
          }`}
        >
          اليوم {todayOrders.length > 0 && <span className="text-[10px] opacity-70">({todayOrders.length})</span>}
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`w-full text-right px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
            showHistory ? "bg-olive/10 text-olive" : "text-mist hover:bg-fog"
          }`}
        >
          السجل {historyOrders.length > 0 && <span className="text-[10px] opacity-70">({historyOrders.length})</span>}
        </button>
      </div>
    ) : null
  );

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
        {/* ── Card header ── */}
        <div className={`px-4 pt-4 pb-3 border-b border-border/60 ${isDead ? "opacity-50" : ""}`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-[13px] text-ink truncate">{order.place_name || "طلب"} <span className="text-mist">#{order.order_number}</span></div>
            </div>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>
        </div>

        {/* ── Date & Time ── */}
        <div className={`flex items-center justify-between px-4 py-2 text-[10px] text-mist ${isDead ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-1.5">
            {isToday(order.created_at) && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive/10 text-olive">اليوم</span>
            )}
            <span>{formatDate(order.created_at)}</span>
          </div>
          <span>{formatTime(order.created_at)}</span>
        </div>

        {/* ── Items ── */}
        <div className={`flex-1 min-h-0 overflow-hidden ${isDead ? "opacity-40" : ""}`}>
          <div className="overflow-y-auto max-h-full px-4 space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="text-ink truncate flex-1 ml-3">{item.item_name} <span className="text-mist mr-1">x{item.quantity}</span></span>
                <span className="tabular-nums text-ink shrink-0">₪{(item.item_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Note ── */}
        {order.note && (
          <div className={`px-4 py-1.5 text-[9px] text-mist border-t border-dashed border-border/60 ${isDead ? "opacity-40" : ""}`}>
            📝 {order.note}
          </div>
        )}

        {/* ── Reject reason ── */}
        {order.reject_reason && (
          <div className="px-4 py-1.5 text-[9px] text-red-500 bg-red-500/5">
            سبب الرفض: {order.reject_reason}
          </div>
        )}

        {/* ── Total ── */}
        <div className={`px-4 py-2.5 flex items-center justify-between ${isDead ? "opacity-50" : ""}`}>
          <span className="text-[12px] font-bold text-ink">الإجمالي</span>
          <div>
            <span className="text-[14px] font-bold text-ink tabular-nums">₪{Number(order.total).toFixed(2)}</span>
            {Number(order.discount_amount) > 0 && (
              <span className="text-[9px] text-emerald-500 font-medium mr-1">(-₪{Number(order.discount_amount).toFixed(2)})</span>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={`px-4 py-2.5 border-t border-border/60 ${isDead ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between">
            <div></div>
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
        <div className="px-4 py-4 space-y-4">
          {/* Page title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-olive/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <h1 className="font-display font-bold text-[18px] text-ink">طلباتي</h1>
          </div>

          {/* Today / History toggle — mobile only */}
          {!isDesktop && (
            <div className="flex gap-0 bg-fog rounded-xl p-1">
              <button
                onClick={() => { setShowHistory(false); setHistoryPage(1); }}
                className={`flex-1 py-2 rounded-lg font-bold text-[12px] transition-all ${
                  !showHistory ? "bg-olive text-white shadow-sm" : "text-mist hover:text-ink"
                }`}
              >
                اليوم {todayOrders.length > 0 && <span className="opacity-70">({todayOrders.length})</span>}
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className={`flex-1 py-2 rounded-lg font-bold text-[12px] transition-all ${
                  showHistory ? "bg-olive text-white shadow-sm" : "text-mist hover:text-ink"
                }`}
              >
                السجل {historyOrders.length > 0 && <span className="opacity-70">({historyOrders.length})</span>}
              </button>
            </div>
          )}

          {/* Orders grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {isLoading && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl border border-border bg-surface flex flex-col overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-border/60 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-border/40 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-3.5 w-24 bg-border/40 rounded animate-pulse mb-1.5" />
                        <div className="h-2.5 w-16 bg-border/30 rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-14 bg-border/30 rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1 px-4 py-3 space-y-2.5">
                      <div className="h-2.5 w-full bg-border/30 rounded animate-pulse" />
                      <div className="h-2.5 w-3/4 bg-border/30 rounded animate-pulse" />
                      <div className="h-2.5 w-2/3 bg-border/30 rounded animate-pulse" />
                    </div>
                    <div className="px-4 py-2.5 border-t border-border/60 flex justify-between">
                      <div className="h-4 w-16 bg-border/40 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-border/30 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {!isLoading && orders.length === 0 && (
              <div className="col-span-full text-center py-16">
                <p className="text-[14px] text-mist font-display">لا توجد طلبات بعد</p>
                <p className="text-[12px] text-mist/60 mt-1">عند طلبك من أي محل ستظهر طلباتك هنا</p>
              </div>
            )}

            {!isLoading && orders.length > 0 && displayOrders.length === 0 && (
              <div className="col-span-full text-center py-10">
                <p className="text-[13px] text-mist">
                  {showHistory ? "لا توجد طلبات سابقة" : "لا توجد طلبات اليوم"}
                </p>
              </div>
            )}

            {!isLoading && displayOrders.map(renderOrder)}

            {!isLoading && showHistory && historyPage < historyTotalPages && (
              <div className="col-span-full flex justify-center pt-1">
                <button
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-[10px] font-bold text-mist hover:text-ink hover:border-olive/30 transition-colors"
                >
                  عرض المزيد ({historyOrders.length - historyPage * HISTORY_PER_PAGE})
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
