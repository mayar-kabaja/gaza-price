"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";

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
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} ي`;
}

export function MyOrdersSheet({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery<MyOrder[]>({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const res = await apiFetch("/api/places/my-orders");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 5000, // Auto-refresh to reflect owner status changes
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiFetch(`/api/places/orders/${orderId}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "تعذر الإلغاء");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[85] bg-surface rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.2)]" dir="rtl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            طلباتي
          </h3>
          <button onClick={onClose} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-border/30 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && orders.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-[13px] text-mist">لا توجد طلبات بعد</p>
            </div>
          )}

          {!isLoading && orders.map((order) => {
            const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
            const isCancelling = cancelMutation.isPending && cancelMutation.variables === order.id;
            return (
              <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-fog">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[12px] text-ink">#{order.order_number}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-[2px] rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <span className="text-[10px] text-mist">{timeAgo(order.created_at)}</span>
                </div>

                <div className="px-3 py-2.5 space-y-1.5">
                  {/* Place name */}
                  {order.place_name && (
                    <div className="text-[11px] font-semibold text-ink">{order.place_name}</div>
                  )}

                  {/* Items */}
                  <div className="space-y-0.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-mist">{item.item_name} <span className="text-ink">×{item.quantity}</span></span>
                        <span className="text-mist tabular-nums">{(item.item_price * item.quantity).toFixed(2)} ₪</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border">
                    <span className="text-[11px] font-bold text-ink">المجموع</span>
                    <span className="text-[12px] font-bold text-olive tabular-nums">{Number(order.total).toFixed(2)} ₪</span>
                  </div>

                  {order.reject_reason && (
                    <div className="text-[10px] text-red-500">سبب الرفض: {order.reject_reason}</div>
                  )}

                  {/* Cancel button — only for pending */}
                  {order.status === "pending" && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => cancelMutation.mutate(order.id)}
                        disabled={isCancelling}
                        className="px-3 py-1 rounded-md border border-red-200 text-red-500 text-[10px] font-bold disabled:opacity-50"
                      >
                        {isCancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
                      </button>
                    </div>
                  )}

                  {cancelMutation.isError && cancelMutation.variables === order.id && (
                    <p className="text-[10px] text-red-500">{(cancelMutation.error as Error).message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
