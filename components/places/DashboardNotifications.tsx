"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";

export interface OrderEvent {
  type: "order_created" | "order_updated";
  order: any;
  seq: number;
}

interface Notification {
  id: string;
  type: "order_created" | "order_updated";
  orderNumber: number;
  customerName: string;
  status: string;
  time: Date;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "طلب جديد",
  accepted: "تم القبول",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  rejected: "تم الرفض",
  cancelled: "تم الإلغاء",
};

const STATUS_ICONS: Record<string, { icon: string; cls: string }> = {
  pending: { icon: "🔔", cls: "bg-amber-100 text-amber-700" },
  accepted: { icon: "✓", cls: "bg-blue-100 text-blue-700" },
  preparing: { icon: "🍳", cls: "bg-violet-100 text-violet-700" },
  ready: { icon: "✅", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { icon: "✕", cls: "bg-red-100 text-red-600" },
  cancelled: { icon: "✕", cls: "bg-gray-100 text-gray-600" },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  return `منذ ${hrs} س`;
}

interface Props {
  token: string;
  ordersEnabled: boolean;
  onOrderEvent?: (type: "order_created" | "order_updated", order: any) => void;
}

export function DashboardNotifications({ token, ordersEnabled, onOrderEvent }: Props) {
  const onOrderEventRef = useRef(onOrderEvent);
  onOrderEventRef.current = onOrderEvent;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function addNotification(type: "order_created" | "order_updated", order: any) {
    const notif: Notification = {
      id: `${order.id}-${Date.now()}`,
      type,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      status: order.status,
      time: new Date(),
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 50));
    setUnreadCount((c) => c + 1);
  }

  // Poll orders as fallback — detect new/updated orders even without SSE
  const knownOrdersRef = useRef<Map<string, string>>(new Map()); // id -> status
  const initialPollDoneRef = useRef(false);

  const { data: polledOrders } = useQuery<any[]>({
    queryKey: ["dashboard-orders", token],
    queryFn: async () => {
      const res = await apiFetch(`/api/places/dashboard/orders?token=${token}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 10000,
    enabled: ordersEnabled,
  });

  useEffect(() => {
    if (!polledOrders || polledOrders.length === 0) return;
    if (!initialPollDoneRef.current) {
      // First load — record known orders
      for (const o of polledOrders) knownOrdersRef.current.set(o.id, o.status);
      initialPollDoneRef.current = true;
      return;
    }
    for (const order of polledOrders) {
      const prevStatus = knownOrdersRef.current.get(order.id);
      if (!prevStatus) {
        // New order detected via polling
        addNotification("order_created", order);
        onOrderEventRef.current?.("order_created", order);
        try { new Audio("/sounds/order-notify.wav").play().catch(() => {}); } catch {}
      } else if (prevStatus !== order.status) {
        // Status changed
        addNotification("order_updated", order);
        onOrderEventRef.current?.("order_updated", order);
      }
    }
    // Update known orders
    const newMap = new Map<string, string>();
    for (const o of polledOrders) newMap.set(o.id, o.status);
    knownOrdersRef.current = newMap;
  }, [polledOrders]);

  // SSE connection for real-time order notifications (instant when SSE works)
  const sseConnectedRef = useRef(false);

  useEffect(() => {
    if (!ordersEnabled || !token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const url = `${baseUrl}/places/dashboard/orders/stream?token=${token}`;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url);

      es.addEventListener("connected", () => {
        sseConnectedRef.current = true;
      });

      es.addEventListener("order_created", (e) => {
        const order = JSON.parse(e.data);
        // Mark as known so polling doesn't double-notify
        knownOrdersRef.current.set(order.id, order.status);
        addNotification("order_created", order);
        onOrderEventRef.current?.("order_created", order);
        try { new Audio("/sounds/order-notify.wav").play().catch(() => {}); } catch {}
      });

      es.addEventListener("order_updated", (e) => {
        const order = JSON.parse(e.data);
        knownOrdersRef.current.set(order.id, order.status);
        addNotification("order_updated", order);
        onOrderEventRef.current?.("order_updated", order);
      });

      es.onerror = () => {
        sseConnectedRef.current = false;
        es?.close();
        retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
      sseConnectedRef.current = false;
      clearTimeout(retryTimer);
    };
  }, [ordersEnabled, token]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) setUnreadCount(0);
  }

  return (
    <div className="relative z-[100]" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors relative"
        title="الإشعارات"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl shadow-lg z-50 overflow-hidden" dir="rtl">
          <div className="px-3 py-2.5 border-b border-[var(--d-border)] flex items-center justify-between">
            <span className="font-bold text-[13px] text-[var(--d-text)]">الإشعارات</span>
            {notifications.length > 0 && (
              <button
                onClick={() => { setNotifications([]); setUnreadCount(0); }}
                className="text-[10px] text-[var(--d-text-muted)] hover:text-[var(--d-text)]"
              >
                مسح الكل
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="py-8 text-center text-[12px] text-[var(--d-text-muted)]">
                لا توجد إشعارات
              </div>
            )}

            {notifications.map((n) => {
              const si = STATUS_ICONS[n.status] || STATUS_ICONS.pending;
              return (
                <div key={n.id} className="px-3 py-2.5 border-b border-[var(--d-border)] last:border-0 hover:bg-[var(--d-subtle-bg)] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 ${si.cls}`}>
                      {si.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[var(--d-text)]">
                        {n.type === "order_created"
                          ? `طلب جديد #${n.orderNumber}`
                          : `${STATUS_LABELS[n.status] || n.status} — #${n.orderNumber}`
                        }
                      </div>
                      <div className="text-[10px] text-[var(--d-text-muted)] mt-0.5">
                        {n.customerName}
                      </div>
                      <div className="text-[9px] text-[var(--d-text-muted)] mt-0.5">
                        {timeAgo(n.time)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
