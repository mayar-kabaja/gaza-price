"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-EG", { weekday: "short", month: "short", day: "numeric" });
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  accepted: { label: "مقبول", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "تحضير", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400" },
  ready: { label: "جاهز", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { label: "ملغي", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} ي`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function MyOrdersSheet({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  // TODO: remove test data
  const TEST_ORDERS: MyOrder[] = [
    {
      id: "test-1", order_number: 1041, status: "pending", subtotal: 115, discount_amount: 0, total: 115,
      note: "بدون بصل", reject_reason: null, place_id: "da33d917", place_name: "ماي برجر - My Burger",
      created_at: new Date().toISOString(),
      items: [
        { id: "ti-1", item_name: "زنجر تشكن برجر", item_price: 40, quantity: 2 },
        { id: "ti-2", item_name: "ماشروم تشكن برجر", item_price: 35, quantity: 1 },
      ],
    },
    {
      id: "test-2", order_number: 1040, status: "accepted", subtotal: 80, discount_amount: 0, total: 80,
      note: null, reject_reason: null, place_id: "da33d917", place_name: "ماي برجر - My Burger",
      created_at: new Date(Date.now() - 25 * 60000).toISOString(),
      items: [
        { id: "ti-3", item_name: "كلاسيك بيف برجر", item_price: 35, quantity: 1 },
        { id: "ti-4", item_name: "تشكن راب دبل", item_price: 45, quantity: 1 },
      ],
    },
    {
      id: "test-3", order_number: 1039, status: "preparing", subtotal: 50, discount_amount: 0, total: 50,
      note: null, reject_reason: null, place_id: "da33d917", place_name: "ماي برجر - My Burger",
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      items: [
        { id: "ti-5", item_name: "وجبة قطع زنجر", item_price: 50, quantity: 1 },
      ],
    },
    {
      id: "test-4", order_number: 1038, status: "ready", subtotal: 70, discount_amount: 0, total: 70,
      note: "اتصل قبل التوصيل", reject_reason: null, place_id: "da33d917", place_name: "ماي برجر - My Burger",
      created_at: new Date(Date.now() - 90 * 60000).toISOString(),
      items: [
        { id: "ti-6", item_name: "هاش تشكن برجر", item_price: 35, quantity: 2 },
      ],
    },
    {
      id: "test-5", order_number: 1035, status: "rejected", subtotal: 40, discount_amount: 0, total: 40,
      note: null, reject_reason: "المنتج غير متوفر حالياً", place_id: "da33d917", place_name: "ماي برجر - My Burger",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      items: [
        { id: "ti-7", item_name: "ماشروم بيف برجر", item_price: 40, quantity: 1 },
      ],
    },
    {
      id: "test-6", order_number: 1030, status: "cancelled", subtotal: 55, discount_amount: 0, total: 55,
      note: null, reject_reason: null, place_id: "da33d917", place_name: "ماي برجر - My Burger",
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      items: [
        { id: "ti-8", item_name: "تشكن راب عادي", item_price: 40, quantity: 1 },
        { id: "ti-9", item_name: "ذرة بالمايونيز", item_price: 5, quantity: 3 },
      ],
    },
  ];

  const { data: orders = TEST_ORDERS, isLoading } = useQuery<MyOrder[]>({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const res = await apiFetch("/api/places/my-orders");
      if (!res.ok) return TEST_ORDERS;
      const data = await res.json();
      const real = data.data || [];
      return real.length > 0 ? real : TEST_ORDERS;
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
  const displayOrders = showHistory ? historyOrders : todayOrders;

  function renderOrder(order: MyOrder) {
    const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
    const isCancelling = cancelMutation.isPending && cancelMutation.variables === order.id;
    const isDead = order.status === "cancelled" || order.status === "rejected";
    return (
      <div key={order.id} className={`flex flex-col rounded-2xl border bg-surface transition-all ${isDead ? "border-border opacity-70" : "border-border shadow-sm"}`}>
        {/* ── Card header ── */}
        <div className={`px-4 pt-4 pb-3 border-b border-border/60 ${isDead ? "opacity-50" : ""}`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-[13px] text-ink truncate">{order.place_name || "طلب"} <span className="text-mist">#{order.order_number}</span></div>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-[2px] rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
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
        <div className={`px-4 space-y-1 ${isDead ? "opacity-40" : ""}`}>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-ink truncate flex-1 ml-3">{item.item_name} <span className="text-mist mr-1">x{item.quantity}</span></span>
              <span className="tabular-nums text-ink shrink-0">₪{(item.item_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* ── Note ── */}
        {order.note && (
          <div className={`px-4 py-1.5 text-[9px] text-mist border-t border-dashed border-border/60 mt-1 ${isDead ? "opacity-40" : ""}`}>
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
        {order.status === "pending" && (
          <div className={`px-4 py-2.5 border-t border-border/60 flex items-center justify-end ${isDead ? "opacity-50" : ""}`}>
            <button
              onClick={() => cancelMutation.mutate(order.id)}
              disabled={isCancelling}
              className="px-3 py-1 rounded-lg border border-red-500/20 text-red-500 text-[10px] font-bold disabled:opacity-50"
            >
              {isCancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
            </button>
          </div>
        )}

        {cancelMutation.isError && cancelMutation.variables === order.id && (
          <p className="text-[10px] text-red-500 px-4 pb-2">{(cancelMutation.error as Error).message}</p>
        )}
      </div>
    );
  }

  /* ── Content (shared between mobile sheet & desktop sidebar) ── */
  const content = (
    <>
      {/* Today / History toggle */}
      {!isLoading && orders.length > 0 && (
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowHistory(false)}
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

      {/* Orders list */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-border/30 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[13px] text-mist">لا توجد طلبات بعد</p>
          </div>
        )}

        {!isLoading && orders.length > 0 && displayOrders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[12px] text-mist">
              {showHistory ? "لا توجد طلبات سابقة" : "لا توجد طلبات اليوم"}
            </p>
          </div>
        )}

        {!isLoading && displayOrders.map(renderOrder)}
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile: bottom sheet ── */}
      <div className="lg:hidden">
        <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[85] bg-surface rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.2)]" dir="rtl">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="px-4 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
            <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {showHistory ? "سجل الطلبات" : "طلباتي"}
            </h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-fog flex items-center justify-center text-mist hover:text-ink">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
            {content}
          </div>
        </div>
      </div>

      {/* ── Desktop: sidebar panel ── */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-[80]" dir="rtl">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative h-full w-[340px] bg-surface border-r border-border shadow-[4px_0_24px_rgba(0,0,0,0.08)] flex flex-col z-[1] animate-[slideInLeft_0.25s_ease]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <h3 className="font-display font-bold text-[16px] text-ink flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-olive/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </div>
              {showHistory ? "سجل الطلبات" : "طلباتي"}
            </h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-fog flex items-center justify-center text-mist hover:text-ink hover:bg-border transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {content}
          </div>
        </div>
      </div>
    </>
  );
}
