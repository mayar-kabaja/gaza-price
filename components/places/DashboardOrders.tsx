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

const STATUS_COLORS: Record<string, { label: string; bg: string; text: string; fill: string }> = {
  pending:   { label: "بالانتظار",    bg: "rgba(255,181,10,0.1)",  text: "#FFB50A", fill: "#FFB50A" },
  accepted:  { label: "مقبول",       bg: "rgba(74,44,115,0.1)",   text: "#4A2C73", fill: "#4A2C73" },
  preparing: { label: "قيد التحضير",  bg: "rgba(38,72,158,0.1)",   text: "#26489E", fill: "#26489E" },
  ready:     { label: "جاهز",        bg: "rgba(90,29,125,0.1)",   text: "#5A1D7D", fill: "#5A1D7D" },
  delivered: { label: "تم التسليم",   bg: "rgba(29,125,34,0.1)",   text: "#1D7D22", fill: "#1D7D22" },
  rejected:  { label: "مرفوض",       bg: "rgba(218,43,43,0.1)",   text: "#DA2B2B", fill: "#DA2B2B" },
  cancelled: { label: "ملغي",        bg: "rgba(150,150,150,0.1)", text: "#969696", fill: "#969696" },
};

function StatusIcon({ status }: { status: string }) {
  const color = STATUS_COLORS[status]?.fill || "#969696";
  switch (status) {
    case "pending":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M11.5 3C14.0196 3 16.4359 4.00089 18.2175 5.78249C19.9991 7.56408 21 9.98044 21 12.5C21 15.0196 19.9991 17.4359 18.2175 19.2175C16.4359 20.9991 14.0196 22 11.5 22C8.98044 22 6.56408 20.9991 4.78249 19.2175C3.00089 17.4359 2 15.0196 2 12.5C2 9.98044 3.00089 7.56408 4.78249 5.78249C6.56408 4.00089 8.98044 3 11.5 3ZM11.5 4C9.24566 4 7.08365 4.89553 5.48959 6.48959C3.89553 8.08365 3 10.2457 3 12.5C3 14.7543 3.89553 16.9163 5.48959 18.5104C7.08365 20.1045 9.24566 21 11.5 21C12.6162 21 13.7215 20.7801 14.7528 20.353C15.7841 19.9258 16.7211 19.2997 17.5104 18.5104C18.2997 17.7211 18.9258 16.7841 19.353 15.7528C19.7801 14.7215 20 13.6162 20 12.5C20 10.2457 19.1045 8.08365 17.5104 6.48959C15.9163 4.89553 13.7543 4 11.5 4ZM11 7H12V12.42L16.7 15.13L16.2 16L11 13V7Z" fill={color}/>
        </svg>
      );
    case "accepted":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C7.3 2 3.5 5.8 3.5 10.5C3.5 15.2 7.3 19 12 19C16.7 19 20.5 15.2 20.5 10.5C20.5 5.8 16.7 2 12 2ZM12 3C16.15 3 19.5 6.35 19.5 10.5C19.5 14.65 16.15 18 12 18C7.85 18 4.5 14.65 4.5 10.5C4.5 6.35 7.85 3 12 3Z" fill={color}/>
          <path d="M11 14.2L6.65 9.85L7.35 9.15L11 12.8L16.65 7.15L17.35 7.85L11 14.2Z" fill={color}/>
        </svg>
      );
    case "preparing":
      return (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M12 19C12 19.2652 11.895 19.5196 11.707 19.7071C11.52 19.8946 11.265 20 11 20C10.735 20 10.48 19.8946 10.293 19.7071C10.105 19.5196 10 19.2652 10 19V16C10 15.7348 10.105 15.4804 10.293 15.2929C10.48 15.1054 10.735 15 11 15C11.265 15 11.52 15.1054 11.707 15.2929C11.895 15.4804 12 15.7348 12 16V19ZM12 4C12 4.26522 11.895 4.51957 11.707 4.70711C11.52 4.89464 11.265 5 11 5C10.735 5 10.48 4.89464 10.293 4.70711C10.105 4.51957 10 4.26522 10 4V1C10 0.734784 10.105 0.480430 10.293 0.292893C10.48 0.105357 10.735 0 11 0C11.265 0 11.52 0.105357 11.707 0.292893C11.895 0.480430 12 0.734784 12 1V4ZM21 10C21 9.73478 20.895 9.48043 20.707 9.29289C20.52 9.10536 20.265 9 20 9H17C16.735 9 16.48 9.10536 16.293 9.29289C16.105 9.48043 16 9.73478 16 10C16 10.2652 16.105 10.5196 16.293 10.7071C16.48 10.8946 16.735 11 17 11H20C20.265 11 20.52 10.8946 20.707 10.7071C20.895 10.5196 21 10.2652 21 10ZM5 9C5.265 9 5.52 9.10536 5.707 9.29289C5.895 9.48043 6 9.73478 6 10C6 10.2652 5.895 10.5196 5.707 10.7071C5.52 10.8946 5.265 11 5 11H2C1.73478 11 1.48043 10.8946 1.29289 10.7071C1.10536 10.5196 1 10.2652 1 10C1 9.73478 1.10536 9.48043 1.29289 9.29289C1.48043 9.10536 1.73478 9 2 9H5ZM18.071 17.071C18.258 16.8835 18.364 16.6292 18.364 16.364C18.364 16.0988 18.258 15.8445 18.071 15.657L15.95 13.536C15.761 13.3538 15.509 13.253 15.247 13.2553C14.984 13.2576 14.734 13.3628 14.548 13.5482C14.363 13.7336 14.258 13.9844 14.255 14.2466C14.253 14.5088 14.354 14.7614 14.536 14.95L16.656 17.071C16.844 17.2586 17.098 17.3641 17.364 17.3642C17.629 17.3643 17.883 17.259 18.071 17.071ZM7.464 5.051C7.563 5.14244 7.643 5.25281 7.698 5.37578C7.753 5.49874 7.783 5.63148 7.786 5.76631C7.789 5.90113 7.764 6.03501 7.714 6.16007C7.663 6.28513 7.588 6.39874 7.493 6.49393C7.397 6.58913 7.284 6.66415 7.159 6.71439C7.034 6.76462 6.9 6.78901 6.765 6.78611C6.63 6.7832 6.497 6.75315 6.374 6.69762C6.252 6.64209 6.141 6.56233 6.05 6.463L3.93 4.344C3.742 4.1565 3.637 3.90207 3.637 3.63686C3.637 3.37164 3.742 3.11714 3.93 2.92953C4.117 2.74192 4.371 2.63637 4.637 2.63631C4.902 2.63625 5.156 2.74149 5.344 2.929L7.464 5.051ZM18.071 2.929C17.883 2.74149 17.629 2.63625 17.364 2.63625C17.099 2.63625 16.845 2.74149 16.657 2.929L14.536 5.05C14.354 5.23864 14.253 5.49124 14.255 5.75344C14.258 6.01564 14.363 6.26644 14.548 6.45184C14.734 6.63724 14.984 6.74244 15.247 6.74474C15.509 6.74704 15.761 6.64624 15.95 6.464L18.071 4.344C18.164 4.25107 18.238 4.14076 18.288 4.01936C18.338 3.89797 18.364 3.76788 18.364 3.63648C18.364 3.50507 18.338 3.37498 18.288 3.25359C18.238 3.13219 18.164 3.02193 18.071 2.929ZM6.051 13.536C6.143 13.4383 6.253 13.3601 6.376 13.3059C6.498 13.2517 6.63 13.2228 6.764 13.2207C6.898 13.2186 7.031 13.2435 7.156 13.2938C7.28 13.3441 7.393 13.4189 7.487 13.5137C7.582 13.6085 7.657 13.7213 7.707 13.8455C7.757 13.9698 7.782 14.1028 7.78 14.2368C7.778 14.3708 7.749 14.5029 7.694 14.6255C7.64 14.748 7.562 14.8583 7.464 14.95L5.344 17.071C5.156 17.2586 4.902 17.3641 4.637 17.3642C4.372 17.3643 4.117 17.259 3.93 17.0715C3.742 16.884 3.636 16.6296 3.636 16.3644C3.636 16.0991 3.741 15.8446 3.929 15.657L6.051 13.536Z" fill={color}/>
        </svg>
      );
    case "ready":
      return (
        <svg width="20" height="20" viewBox="65 10 23 24" fill="none">
          <path d="M76.5 32C75.682 32 74.9 31.67 73.337 31.01C69.446 29.366 67.5 28.543 67.5 27.16V17M76.5 32C77.318 32 78.1 31.67 79.663 31.01C83.554 29.366 85.5 28.543 85.5 27.16V17M76.5 32V21.355M70.5 22L72.5 23M81.5 14L71.5 19M72.826 19.691L69.905 18.278C68.302 17.502 67.5 17.114 67.5 16.5C67.5 15.886 68.302 15.498 69.905 14.722L72.825 13.309C74.63 12.436 75.53 12 76.5 12C77.47 12 78.371 12.436 80.174 13.309L83.095 14.722C84.698 15.498 85.5 15.886 85.5 16.5C85.5 17.114 84.698 17.502 83.095 18.278L80.175 19.691C78.37 20.564 77.47 21 76.5 21C75.53 21 74.629 20.564 72.826 19.691Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "delivered":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M18.0901 2.54902C17.5381 2.23902 16.9501 2.20902 16.3291 2.28602C15.7391 2.36002 15.0201 2.54602 14.1571 2.77102L12.1381 3.29502C11.2751 3.52002 10.5571 3.70602 10.0081 3.92902C9.42907 4.16302 8.92907 4.47702 8.60507 5.02202C8.27907 5.57002 8.24707 6.15602 8.32807 6.76802C8.40507 7.34502 8.59807 8.04502 8.82807 8.87902L9.37107 10.843C9.60107 11.678 9.79507 12.377 10.0261 12.913C10.2711 13.483 10.5981 13.968 11.1541 14.28C11.7061 14.589 12.2941 14.62 12.9161 14.542C13.5061 14.469 14.2251 14.282 15.0881 14.057L17.1071 13.533C17.9701 13.309 18.6881 13.122 19.2371 12.899C19.8161 12.665 20.3161 12.351 20.6401 11.806C20.9661 11.258 20.9981 10.672 20.9171 10.061C20.8401 9.48402 20.6471 8.78302 20.4171 7.94902L19.8741 5.98502C19.6441 5.15102 19.4501 4.45102 19.2191 3.91502C18.9741 3.34502 18.6451 2.86002 18.0901 2.54902ZM14.4861 4.23502C15.4111 3.99502 16.0341 3.83502 16.5161 3.77502C16.9771 3.71702 17.1981 3.76802 17.3591 3.85802C17.5161 3.94602 17.6671 4.09902 17.8421 4.50802C18.0271 4.93802 18.1951 5.53702 18.4431 6.43502L18.9571 8.29802C19.2061 9.19602 19.3701 9.79602 19.4311 10.258C19.4891 10.697 19.4371 10.896 19.3511 11.039C19.2641 11.186 19.1061 11.335 18.6761 11.509C18.2281 11.69 17.6061 11.854 16.6811 12.094L14.7611 12.593C13.8361 12.833 13.2131 12.993 12.7311 13.053C12.2691 13.112 12.0491 13.061 11.8881 12.971C11.7311 12.883 11.5801 12.729 11.4051 12.321C11.2201 11.891 11.0521 11.291 10.8041 10.393L10.2901 8.53102C10.0411 7.63102 9.87707 7.03202 9.81607 6.57102C9.75807 6.13102 9.81007 5.93302 9.89607 5.78902C9.98307 5.64202 10.1411 5.49302 10.5711 5.31902C11.0191 5.13802 11.6411 4.97502 12.5661 4.73402L14.4861 4.23502Z" fill={color}/>
          <path fillRule="evenodd" clipRule="evenodd" d="M3.20007 4.72507C3.01062 4.67862 2.81052 4.70781 2.64223 4.80645C2.47395 4.90509 2.35071 5.06541 2.29867 5.25341C2.24663 5.4414 2.26988 5.64227 2.36349 5.81341C2.4571 5.98455 2.6137 6.11248 2.80007 6.17007L4.50307 6.64307C4.92907 6.76107 5.24607 7.08307 5.35407 7.47407L7.30607 14.5371C7.23074 14.5517 7.15574 14.5691 7.08107 14.5891C5.10407 15.1021 3.89607 17.0911 4.43807 19.0561C4.97807 21.0111 7.03207 22.1381 9.00107 21.6261C10.7251 21.1791 11.8641 19.6101 11.7681 17.9141L20.1881 15.7261C20.2834 15.7013 20.3729 15.658 20.4515 15.5987C20.5302 15.5393 20.5963 15.4651 20.6462 15.3801C20.6961 15.2952 20.7288 15.2013 20.7424 15.1037C20.7561 15.0062 20.7503 14.9069 20.7256 14.8116C20.7008 14.7162 20.6575 14.6267 20.5982 14.5481C20.5388 14.4695 20.4646 14.4033 20.3796 14.3534C20.2947 14.3035 20.2008 14.2708 20.1032 14.2572C20.0057 14.2436 19.9064 14.2493 19.8111 14.2741L11.3731 16.4671C11.1206 15.9847 10.7653 15.5637 10.3323 15.2336C9.89927 14.9036 9.3991 14.6727 8.86707 14.5571L6.80007 7.07407C6.67293 6.62405 6.4315 6.21459 6.09926 5.88551C5.76702 5.55642 5.35528 5.31891 4.90407 5.19607L3.20007 4.72507ZM7.45907 16.0401C8.67107 15.7261 9.88707 16.4291 10.1991 17.5591C10.5091 18.6791 9.82907 19.8621 8.62507 20.1751C7.41307 20.4901 6.19707 19.7861 5.88507 18.6561C5.57507 17.5361 6.25507 16.3531 7.45907 16.0401Z" fill={color}/>
        </svg>
      );
    case "rejected":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12.0002 12.708L6.75423 17.954C6.6609 18.0473 6.54623 18.0973 6.41023 18.104C6.27423 18.1107 6.1529 18.0607 6.04623 17.954C5.93956 17.8473 5.88623 17.7293 5.88623 17.6C5.88623 17.4707 5.93956 17.3527 6.04623 17.246L11.2922 12L6.04623 6.75399C5.9529 6.66065 5.9029 6.54599 5.89623 6.40999C5.88956 6.27399 5.93956 6.15265 6.04623 6.04599C6.1529 5.93932 6.2709 5.88599 6.40023 5.88599C6.52956 5.88599 6.64756 5.93932 6.75423 6.04599L12.0002 11.292L17.2462 6.04599C17.3396 5.95265 17.4546 5.90265 17.5912 5.89599C17.7266 5.88932 17.8476 5.93932 17.9542 6.04599C18.0609 6.15265 18.1142 6.27065 18.1142 6.39999C18.1142 6.52932 18.0609 6.64732 17.9542 6.75399L12.7082 12L17.9542 17.246C18.0476 17.3393 18.0976 17.4543 18.1042 17.591C18.1109 17.7263 18.0609 17.8473 17.9542 17.954C17.8476 18.0607 17.7296 18.114 17.6002 18.114C17.4709 18.114 17.3529 18.0607 17.2462 17.954L12.0002 12.708Z" fill={color}/>
        </svg>
      );
    case "cancelled":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z" fill={color}/>
        </svg>
      );
    default:
      return null;
  }
}

function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "lg" }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.cancelled;
  const isLg = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full shrink-0 ${isLg ? "px-3.5 py-2.5 text-[14px]" : "px-3 py-1.5 text-[11px]"}`}
      style={{ background: s.bg, color: s.text }}
    >
      <StatusIcon status={status} />
      {s.label}
    </span>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", { weekday: "short", month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs}س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days}ي`;
}

interface Props {
  token: string;
  ordersEnabled: boolean;
  onToggleOrders: () => void | Promise<void>;
  lastEvent?: { type: "order_created" | "order_updated"; order: any } | null;
  mobile?: boolean;
  search?: string;
}

const ORDERS_PER_PAGE = 12;

export function DashboardOrders({ token, ordersEnabled, onToggleOrders, lastEvent, mobile, search = "" }: Props) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["dashboard-orders", token], [token]);
  const [newOrderFlash, setNewOrderFlash] = useState<string | null>(null);
  const [togglingOrders, setTogglingOrders] = useState(false);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiFetch(`/api/places/dashboard/orders?token=${token}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 10000,
    enabled: ordersEnabled,
  });

  // Detect new orders from polling and trigger sound + flash
  useEffect(() => {
    if (isLoading || orders.length === 0) return;
    const currentIds = new Set(orders.map((o) => o.id));
    if (!initialLoadDoneRef.current) {
      // First load — just record known IDs, don't notify
      knownIdsRef.current = currentIds;
      initialLoadDoneRef.current = true;
      return;
    }
    // Find new orders that weren't in the previous known set
    const newOrders = orders.filter((o) => !knownIdsRef.current.has(o.id));
    if (newOrders.length > 0) {
      // Flash the newest one
      setNewOrderFlash(newOrders[0].id);
      setTimeout(() => setNewOrderFlash(null), 3000);
      // Play sound
      try { new Audio("/sounds/order-notify.wav").play().catch(() => {}); } catch {}
    }
    knownIdsRef.current = currentIds;
  }, [orders, isLoading]);

  // SSE events (if SSE is connected)
  const lastProcessedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastEvent) return;
    const eventKey = `${lastEvent.order.id}-${lastEvent.order.status}`;
    if (lastProcessedRef.current === eventKey) return;
    lastProcessedRef.current = eventKey;

    if (lastEvent.type === "order_created") {
      const order = lastEvent.order as Order;
      // Add to known IDs so polling doesn't double-notify
      knownIdsRef.current.add(order.id);
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
    onMutate: async ({ orderId, status, reason }) => {
      // Optimistic: update status locally
      const prev = queryClient.getQueryData<Order[]>(queryKey);
      queryClient.setQueryData<Order[]>(queryKey, (old = []) =>
        old.map((o) => o.id === orderId ? { ...o, status, reject_reason: reason || o.reject_reason } : o)
      );
      setRejectId(null);
      setRejectReason("");
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const filtered = useMemo(() => {
    let base = orders;
    if (filter === "today") base = base.filter((o) => isToday(o.created_at));
    else if (filter) base = base.filter((o) => o.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((o) =>
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        String(o.order_number).includes(q)
      );
    }
    return base;
  }, [orders, filter, search]);

  const [mobileVisible, setMobileVisible] = useState(ORDERS_PER_PAGE);

  useEffect(() => { setPage(1); setMobileVisible(ORDERS_PER_PAGE); }, [filter]);

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
          <h3 className="font-bold text-[16px] text-[var(--d-text)]">الطلبات</h3>
          {pendingCount > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600">
              {pendingCount} بانتظار
            </span>
          )}
        </div>
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

      {!ordersEnabled && (
        <div className="text-center py-5 text-[var(--d-text-muted)] text-[11px]">
          فعّل استقبال الطلبات ليتمكن الزبائن من الطلب
        </div>
      )}

      {ordersEnabled && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => {
              const count = tab.value ? (counts[tab.value] || 0) : orders.length;
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
              <div className="rounded-2xl border border-[var(--d-border)] overflow-hidden bg-[var(--d-card)]">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 border-b border-[var(--d-border)] last:border-0 animate-pulse bg-[var(--d-subtle-bg)]/50" />
                ))}
              </div>
            )
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 text-[var(--d-text-muted)] text-[12px]">
              {search.trim() ? "لا توجد نتائج" : "لا توجد طلبات"}
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
              <StatusBadge status={order.status} />
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

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
    <div className="rounded-2xl border border-[var(--d-border)] overflow-hidden bg-[var(--d-card)]">
      <table className="w-full text-right">
        <thead>
          <tr className="border-b border-[var(--d-border)] bg-[var(--d-subtle-bg)]">
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">#</th>
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">العميل</th>
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">رقم الواتس</th>
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">الوقت</th>
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">المجموع</th>
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">الحالة</th>
            <th className="px-4 py-3 text-[11px] font-bold text-[var(--d-text-muted)]">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
          
            const isUpdating = updateMutation.isPending && updateMutation.variables?.orderId === order.id;
            const isDead = order.status === "cancelled" || order.status === "rejected";
            return (
              <tr
                key={order.id}
                className={`border-b border-[var(--d-border)] last:border-0 transition-colors hover:bg-[var(--d-subtle-bg)] ${
                  isDead ? "opacity-60" : ""
                } ${
                  newOrderFlash === order.id ? "bg-amber-500/5" : ""
                } ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
              >
                <td className="px-4 py-4 text-[13px] font-bold text-[var(--d-text)]">#{order.order_number}</td>
                <td className="px-4 py-4 text-[13px] font-semibold text-[var(--d-text)]">{order.customer_name}</td>
                <td className="px-4 py-4">
                  <a
                    href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[var(--d-text-muted)] hover:text-[#25D366] transition-colors"
                    dir="ltr"
                  >
                    {order.customer_phone}
                  </a>
                </td>
                <td className="px-4 py-4 text-[12px] text-[var(--d-text-muted)]">{timeAgo(order.created_at)}</td>
                <td className="px-4 py-4 text-[13px] font-bold text-[var(--d-text)] tabular-nums">₪{Number(order.total).toFixed(2)}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={order.status} size="lg" />
                </td>
                <td className="px-4 py-4">
                  {isDead ? (
                    <span className="text-[11px] text-[var(--d-text-muted)]">—</span>
                  ) : rejectId === order.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="سبب الرفض"
                        className="w-24 rounded-lg border border-[var(--d-border)] px-2 py-1 text-[10px] bg-transparent text-[var(--d-text)] focus:outline-none"
                        dir="rtl"
                      />
                      <button
                        onClick={() => { updateMutation.mutate({ orderId: order.id, status: "rejected", reason: rejectReason }); setOpenMenuId(null); }}
                        className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold"
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
                  ) : (
                    <div className="relative" ref={openMenuId === order.id ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--d-text-muted)] hover:bg-[var(--d-subtle-bg)] transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                        </svg>
                      </button>
                      {openMenuId === order.id && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl shadow-lg z-50 overflow-hidden" dir="rtl">
                          {order.status === "pending" && (
                            <>
                              <button
                                onClick={() => { updateMutation.mutate({ orderId: order.id, status: "accepted" }); setOpenMenuId(null); }}
                                disabled={isUpdating}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors disabled:opacity-50"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A2C73" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                                قبول الطلب
                              </button>
                              <button
                                onClick={() => { setRejectId(order.id); setOpenMenuId(null); }}
                                disabled={isUpdating}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-50"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                رفض الطلب
                              </button>
                            </>
                          )}
                          {order.status === "accepted" && (
                            <button
                              onClick={() => { updateMutation.mutate({ orderId: order.id, status: "preparing" }); setOpenMenuId(null); }}
                              disabled={isUpdating}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors disabled:opacity-50"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#26489E" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                              بدء التحضير
                            </button>
                          )}
                          {order.status === "preparing" && (
                            <button
                              onClick={() => { updateMutation.mutate({ orderId: order.id, status: "ready" }); setOpenMenuId(null); }}
                              disabled={isUpdating}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors disabled:opacity-50"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A1D7D" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                              جاهز للاستلام
                            </button>
                          )}
                          {order.status === "ready" && (
                            <button
                              onClick={() => { updateMutation.mutate({ orderId: order.id, status: "delivered" }); setOpenMenuId(null); }}
                              disabled={isUpdating}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors disabled:opacity-50"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D7D22" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                              تم التسليم
                            </button>
                          )}
                          <div className="border-t border-[var(--d-border)]" />
                          <button
                            onClick={() => { onSelect?.(order); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-[var(--d-text)] hover:bg-[var(--d-subtle-bg)] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                            عرض التفاصيل
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  const isUpdating = updateMutation.isPending && updateMutation.variables?.orderId === order.id;
  const isDead = order.status === "cancelled" || order.status === "rejected";

  return (
    <div
      onClick={() => onSelect?.(order)}
      className={`h-[340px] flex flex-col rounded-2xl border bg-[var(--d-card)] transition-all duration-500 cursor-pointer ${
        isUpdating ? "opacity-50 pointer-events-none" : ""
      } ${
        newOrderFlash === order.id
          ? "border-amber-400 ring-2 ring-amber-400/40 animate-[orderFlash_1.5s_ease-in-out_infinite] shadow-[0_0_20px_rgba(251,191,36,0.4)]"
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
          <StatusBadge status={order.status} />
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
