"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAreas } from "@/lib/queries/hooks";
import { apiFetch } from "@/lib/api/fetch";

/* ── Types ── */
type MenuItem = { id: string; name: string; description?: string | null; price: string; available: boolean; photo_url?: string | null };
type MenuSection = { id: string; name: string; items: MenuItem[] };
type PlaceData = {
  id: string; name: string; section: string; type: string;
  area?: { id: string; name_ar: string }; area_id?: string;
  address?: string | null; phone?: string | null; whatsapp?: string | null;
  is_open: boolean; status: string; plan: string;
  avatar_url?: string | null;
  plan_expires_at?: string | null; menu: MenuSection[];
};
type WorkspaceDetailsForm = {
  price_hour: string; price_half_day: string; price_day: string; price_week: string; price_month: string;
  total_seats: string; available_seats: string; opens_at: string; closes_at: string;
};
type WorkspaceServiceForm = { service: string; available: boolean; detail: string };
type Sheet = null | "menu" | "edit" | "plans" | "addItem" | "addSection" | "editItem" | "wsDetails" | "wsServices";

/* ── Plan data ── */
const PLANS = [
  { key: "free", badge: "مجاني", name: "Free", price: "0", badgeClass: "bg-[#F1EFE8] text-[#444441]", featured: false },
  { key: "basic", badge: "أساسي", name: "Basic", price: "100", badgeClass: "bg-[#E1F5EE] text-[#085041]", featured: false },
  { key: "premium", badge: "الأفضل", name: "Premium", price: "200", badgeClass: "bg-[#3A6347] text-white", featured: true },
] as const;

const FEATURES = [
  { name: "ظهور في القائمة",     free: true,  basic: true,  premium: true },
  { name: "صفحة المحل",         free: true,  basic: true,  premium: true },
  { name: "قائمة الأسعار",       free: true,  basic: true,  premium: true },
  { name: "Toggle مفتوح/مغلق",  free: true,  basic: true,  premium: true },
  { name: "لوحة تحكم",          free: true,  basic: true,  premium: true },
  { name: "إحصائيات الزيارات",   free: false, basic: true,  premium: true },
  { name: "في قسم الأبرز",       free: false, basic: false, premium: true },
  { name: 'شارة "موثّق"',       free: false, basic: true,  premium: true },
  { name: "تقارير الأسعار",      free: false, basic: true,  premium: true },
  { name: "PDF المنيو",          free: false, basic: false, premium: true },
];

export default function OwnerDashboardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center" dir="rtl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
        </div>
      }
    >
      <OwnerDashboardPage />
    </Suspense>
  );
}

function OwnerDashboardPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];

  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [saving, setSaving] = useState(false);

  // Add item form
  const [addItemSection, setAddItemSection] = useState("");
  const [addItemName, setAddItemName] = useState("");
  const [addItemPrice, setAddItemPrice] = useState("");
  const [addItemDesc, setAddItemDesc] = useState("");
  const [addItemPhoto, setAddItemPhoto] = useState("");

  // Add section form
  const [addSectionName, setAddSectionName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Edit item form
  const [editItemId, setEditItemId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemPhoto, setEditItemPhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Action loading — tracks which action is running
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Workspace forms
  const [wsDetails, setWsDetails] = useState<WorkspaceDetailsForm>({ price_hour: '', price_half_day: '', price_day: '', price_week: '', price_month: '', total_seats: '', available_seats: '', opens_at: '', closes_at: '' });
  const [wsServices, setWsServices] = useState<WorkspaceServiceForm[]>([]);
  const [wsLoading, setWsLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const qs = `token=${token}`;
  const isWorkspace = place?.section === 'workspace';

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function uploadProductPhoto(file: File): Promise<string | null> {
    setUploadingPhoto(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${base}/upload/product`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) return data.url;
      showToast("فشل رفع الصورة");
      return null;
    } catch {
      showToast("فشل رفع الصورة");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }

  const load = useCallback(async () => {
    if (!token) { setError("رمز المالك مطلوب"); setLoading(false); return; }
    try {
      const res = await apiFetch(`/api/places/dashboard?${qs}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.message ?? "رمز المالك غير صحيح"); setLoading(false); return; }
      setPlace(data.data);
    } catch { setError("تعذر الاتصال بالخادم"); } finally { setLoading(false); }
  }, [token, qs]);

  useEffect(() => { load(); }, [load]);

  function openEdit() {
    if (!place) return;
    setEditName(place.name);
    setEditAddress(place.address ?? "");
    setEditPhone(place.phone ?? "");
    setEditWhatsapp(place.whatsapp ?? "");
    setEditAreaId(place.area_id ?? place.area?.id ?? "");
    setSheet("edit");
  }

  async function handleToggleOpen() {
    if (!token || toggling) return;
    setToggling(true);
    setActionLoading("toggle-open");
    try {
      const res = await apiFetch(`/api/places/dashboard/toggle-open?${qs}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success && place) {
        setPlace({ ...place, is_open: data.is_open });
        showToast(data.is_open ? (isWorkspace ? "المساحة مفتوحة الآن ✓" : "المحل مفتوح الآن ✓") : (isWorkspace ? "المساحة مغلقة الآن ✓" : "المحل مغلق الآن ✓"));
      }
    } catch { showToast("حدث خطأ"); } finally { setToggling(false); setActionLoading(null); }
  }

  async function handleSaveEdit() {
    if (!token || saving) return;
    setSaving(true);
    setActionLoading("save-edit");
    try {
      const body: Record<string, string> = {};
      if (editName !== place?.name) body.name = editName;
      if (editAddress !== (place?.address ?? "")) body.address = editAddress;
      if (editPhone !== (place?.phone ?? "")) body.phone = editPhone;
      if (editWhatsapp !== (place?.whatsapp ?? "")) body.whatsapp = editWhatsapp;
      if (editAreaId !== (place?.area_id ?? place?.area?.id ?? "")) body.area_id = editAreaId;
      const res = await apiFetch(`/api/places/dashboard/update?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) { await load(); setSheet(null); showToast("تم الحفظ ✓"); }
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleToggleItem(itemId: string) {
    setActionLoading(`toggle-item-${itemId}`);
    try {
      await apiFetch(`/api/places/dashboard/menu/items/${itemId}/toggle?${qs}`, { method: "PATCH" });
      await load();
    } catch { showToast("حدث خطأ"); } finally { setActionLoading(null); }
  }

  function handleDeleteItem(itemId: string) {
    setConfirmDialog({
      message: "هل أنت متأكد من حذف هذا الصنف؟",
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(`delete-item-${itemId}`);
        try {
          await apiFetch(`/api/places/dashboard/menu/items/${itemId}/delete?${qs}`, { method: "DELETE" });
          await load();
          showToast("تم الحذف ✓");
        } catch { showToast("حدث خطأ"); } finally { setActionLoading(null); }
      },
    });
  }

  function handleDeleteSection(sectionId: string) {
    setConfirmDialog({
      message: "هل أنت متأكد من حذف هذا القسم وجميع أصنافه؟",
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(`delete-section-${sectionId}`);
        try {
          await apiFetch(`/api/places/dashboard/menu/sections/${sectionId}/delete?${qs}`, { method: "DELETE" });
          await load();
          showToast("تم الحذف ✓");
        } catch { showToast("حدث خطأ"); } finally { setActionLoading(null); }
      },
    });
  }

  function openEditItem(item: MenuItem) {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price);
    setEditItemDesc(item.description ?? "");
    setEditItemPhoto(item.photo_url ?? "");
    setSheet("editItem");
  }

  async function handleUpdateItem() {
    if (!editItemName.trim()) return;
    setSaving(true);
    setActionLoading("update-item");
    try {
      await apiFetch(`/api/places/dashboard/menu/items/${editItemId}/update?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editItemName.trim(), price: editItemPrice || "0", description: editItemDesc.trim() || null, photo_url: editItemPhoto || null }),
      });
      await load();
      setSheet("menu");
      showToast("تم التعديل ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleAddItem() {
    if (!addItemName.trim() || !addItemSection) return;
    setSaving(true);
    setActionLoading("add-item");
    try {
      await apiFetch(`/api/places/dashboard/menu/items?${qs}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: addItemSection, name: addItemName.trim(), price: addItemPrice || "0", description: addItemDesc.trim() || undefined, photo_url: addItemPhoto || undefined }),
      });
      await load();
      setAddItemName(""); setAddItemPrice(""); setAddItemDesc(""); setAddItemPhoto("");
      setSheet("menu");
      showToast("تمت الإضافة ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  async function handleAddSection() {
    if (!addSectionName.trim()) return;
    setSaving(true);
    setActionLoading("add-section");
    try {
      await apiFetch(`/api/places/dashboard/menu/sections?${qs}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addSectionName.trim() }),
      });
      await load();
      setAddSectionName("");
      setSheet("menu");
      showToast("تمت الإضافة ✓");
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); setActionLoading(null); }
  }

  const ALL_WS_SERVICES = ['wifi', 'electricity', 'printing', 'screens', 'private_rooms', 'drinks'];
  const WS_SERVICE_LABELS: Record<string, string> = { wifi: 'WiFi', electricity: 'كهرباء', printing: 'طباعة', screens: 'شاشات', private_rooms: 'غرف خاصة', drinks: 'مشروبات' };

  async function openWsDetails() {
    if (!place) return;
    setWsLoading(true);
    setSheet("wsDetails");
    try {
      const res = await apiFetch(`/api/places/${place.id}/workspace`);
      const data = await res.json();
      const d = data?.data?.details;
      setWsDetails({
        price_hour: d?.price_hour ?? '', price_half_day: d?.price_half_day ?? '',
        price_day: d?.price_day ?? '', price_week: d?.price_week ?? '', price_month: d?.price_month ?? '',
        total_seats: d?.total_seats?.toString() ?? '', available_seats: d?.available_seats?.toString() ?? '',
        opens_at: d?.opens_at?.slice(0,5) ?? '', closes_at: d?.closes_at?.slice(0,5) ?? '',
      });
    } catch {} finally { setWsLoading(false); }
  }

  async function openWsServices() {
    if (!place) return;
    setWsLoading(true);
    setSheet("wsServices");
    try {
      const res = await apiFetch(`/api/places/${place.id}/workspace`);
      const data = await res.json();
      const existing = data?.data?.services || [];
      setWsServices(ALL_WS_SERVICES.map(s => {
        const found = existing.find((e: any) => e.service === s);
        return { service: s, available: found?.available ?? false, detail: found?.detail ?? '' };
      }));
    } catch {} finally { setWsLoading(false); }
  }

  async function handleSaveWsDetails() {
    if (!place || !token) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (wsDetails.price_hour) body.price_hour = Number(wsDetails.price_hour);
      if (wsDetails.price_half_day) body.price_half_day = Number(wsDetails.price_half_day);
      if (wsDetails.price_day) body.price_day = Number(wsDetails.price_day);
      if (wsDetails.price_week) body.price_week = Number(wsDetails.price_week);
      if (wsDetails.price_month) body.price_month = Number(wsDetails.price_month);
      if (wsDetails.total_seats) body.total_seats = Number(wsDetails.total_seats);
      if (wsDetails.available_seats) body.available_seats = Number(wsDetails.available_seats);
      if (wsDetails.opens_at) body.opens_at = wsDetails.opens_at;
      if (wsDetails.closes_at) body.closes_at = wsDetails.closes_at;
      await apiFetch(`/api/places/${place.id}/workspace/details?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      showToast("تم الحفظ ✓");
      setSheet(null);
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); }
  }

  async function handleSaveWsServices() {
    if (!place || !token) return;
    setSaving(true);
    try {
      const services = wsServices.filter(s => s.available).map(s => ({
        service: s.service, available: true, detail: s.detail || undefined,
      }));
      await apiFetch(`/api/places/${place.id}/workspace/services?${qs}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services }),
      });
      showToast("تم الحفظ ✓");
      setSheet(null);
    } catch { showToast("حدث خطأ"); } finally { setSaving(false); }
  }

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center" dir="rtl">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
    </div>
  );
  if (error || !place) return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-lg font-bold text-[#111827] mb-2">{error ?? "رمز غير صحيح"}</h1>
        <p className="text-sm text-[#6B7280]">تأكد من الرابط الذي حصلت عليه من فريق غزة بريس.</p>
      </div>
    </div>
  );

  const totalItems = place.menu.reduce((a, s) => a + s.items.length, 0);
  const availableItems = place.menu.reduce((a, s) => a + s.items.filter((i) => i.available).length, 0);
  const planLabels: Record<string, string> = { free: "مجانية", basic: "أساسية", premium: "مميزة" };

  return (
    <div className="min-h-screen bg-[#F9FAFB] relative" dir="rtl">
      {/* ══ GREEN HEADER ══ */}
      <div className="bg-[#4A7C59] px-4 pt-4 pb-5 relative overflow-hidden">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-white/5 -top-[70px] -left-[50px]" />
        <div className="absolute w-[120px] h-[120px] rounded-full bg-white/[0.04] -bottom-10 -right-5" />

        {/* Top bar — same as app header */}
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="w-8 h-8 rounded-full" />
            <span className="font-bold text-xl text-white leading-none">
              غزة <span className="text-[#C9A96E]">بريس</span>
            </span>
          </a>
          <span className="text-[10px] font-bold text-white/50 bg-white/10 rounded-full px-2.5 py-1">لوحة التحكم</span>
        </div>

        {/* Place identity */}
        <div className="flex items-center gap-3 mb-4 relative z-[1]">
          <div className="w-[50px] h-[50px] rounded-[14px] bg-white/[0.14] border-[1.5px] border-white/[0.22] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
            {place.avatar_url ? (
              <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : place.section === "workspace" ? "💼" : place.section === "food" ? "🍽️" : "🏪"}
          </div>
          <div>
            <div className="font-bold text-[17px] text-white">{place.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {place.area && <span className="text-[11px] text-white/55">📍 {place.area.name_ar}</span>}
              <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-white/[0.14] text-white/85">
                {place.type}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ══ WHITE CONTENT ══ */}
      <div className="px-4 py-4 pb-24">
        {/* Open toggle — outside header */}
        <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-2xl p-3 -mt-6 mb-3 relative z-[2] shadow-sm">
          <div>
            <div className={`font-bold text-[13px] ${place.is_open ? "text-[#4A7C59]" : "text-[#9CA3AF]"}`}>
              {place.is_open ? `● ${isWorkspace ? 'المساحة مفتوحة' : 'المحل مفتوح'} الآن` : `○ ${isWorkspace ? 'المساحة مغلقة' : 'المحل مغلق'} الآن`}
            </div>
            <div className="text-[10px] text-[#9CA3AF]">
              {place.is_open ? 'يظهر للزوار كـ "مفتوح"' : 'يظهر للزوار كـ "مغلق"'}
            </div>
          </div>
          <button
            onClick={handleToggleOpen}
            disabled={toggling}
            className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${place.is_open ? "bg-[#4A7C59]" : "bg-[#E5E7EB]"}`}
          >
            {actionLoading === "toggle-open" ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${place.is_open ? "right-[25px]" : "right-[3px]"}`} />
            )}
          </button>
        </div>

        {/* Stats cards */}
        {!isWorkspace ? (
        <div className="grid grid-cols-3 gap-2.5 mb-4 relative z-[2]">
          {[
            { num: place.menu.length, label: "أقسام" },
            { num: totalItems, label: "صنف" },
            { num: availableItems, label: "متوفر" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#E5E7EB] rounded-2xl py-3 px-2 text-center shadow-sm">
              <div className="font-bold text-[22px] text-[#111827] leading-none mb-1">{s.num}</div>
              <div className="text-[9px] text-[#9CA3AF] font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
        ) : null}
        {/* Plan badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9CA3AF] font-semibold">الباقة:</span>
            <span className="text-[11px] font-bold py-1 px-2.5 rounded-full bg-[#EBF3EE] text-[#4A7C59]">
              {planLabels[place.plan] ?? place.plan}
            </span>
          </div>
          <button onClick={() => setSheet("plans")} className="text-[11px] font-bold text-[#3A6347]">
            ترقية ←
          </button>
        </div>

        {/* Actions */}
        <div className="text-[13px] font-bold text-[#374151] mb-2.5 pr-0.5">الإجراءات</div>
        <div className="bg-white rounded-[18px] border border-[#E5E7EB] overflow-hidden shadow-sm mb-4">
          {isWorkspace ? (
            <>
              {/* Workspace details */}
              <ActionItem
                icon={<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
                iconBg="bg-[#EBF3EE]" iconColor="stroke-[#4A7C59]"
                title="الأسعار والأوقات"
                sub="أسعار الساعة/اليوم، مواعيد العمل، المقاعد"
                onClick={openWsDetails}
              />
              {/* Workspace services */}
              <ActionItem
                icon={<svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>}
                iconBg="bg-[#EEF2FF]" iconColor="stroke-[#4F46E5]"
                title="الخدمات المتاحة"
                sub="WiFi، كهرباء، طباعة، شاشات، مشروبات"
                onClick={openWsServices}
              />
            </>
          ) : (
            <>
              {/* Menu management */}
              <ActionItem
                icon={<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x={9} y={3} width={6} height={4} rx={2} /><line x1={9} y1={12} x2={15} y2={12} /><line x1={9} y1={16} x2={13} y2={16} /></svg>}
                iconBg="bg-[#EBF3EE]" iconColor="stroke-[#4A7C59]"
                title="إدارة القائمة"
                sub={`${totalItems} صنف — تعديل الأسعار والتوفر`}
                badge={<span className="text-[9px] font-bold py-1 px-2 rounded-full bg-[#EBF3EE] text-[#4A7C59]">{totalItems} صنف</span>}
                onClick={() => setSheet("menu")}
              />
            </>
          )}
          {/* Edit info */}
          <ActionItem
            icon={<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>}
            iconBg="bg-[#EEF2FF]" iconColor="stroke-[#4F46E5]"
            title={isWorkspace ? "تعديل بيانات المساحة" : "تعديل بيانات المحل"}
            sub="اسم، منطقة، هاتف، واتساب"
            onClick={openEdit}
          />
          {/* Share */}
          <ActionItem
            icon={<svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1={12} y1={2} x2={12} y2={15} /></svg>}
            iconBg="bg-[#F1F5F9]" iconColor="stroke-[#475569]"
            title={isWorkspace ? "مشاركة صفحة المساحة" : "مشاركة صفحة المحل"}
            sub={isWorkspace ? "شارك رابط مساحتك مع العملاء" : "شارك رابط محلك مع الزبائن"}
            onClick={() => {
              const url = `${window.location.origin}/places/${place.id}`;
              navigator.clipboard.writeText(url);
              showToast("تم نسخ الرابط ✓");
            }}
            last
          />
        </div>

        {/* Quick menu preview */}
        {!isWorkspace && place.menu.length > 0 && (
          <>
            <div className="text-[13px] font-bold text-[#374151] mb-2.5 pr-0.5">القائمة</div>
            <div className="bg-white rounded-[14px] border border-[#E5E7EB] overflow-hidden shadow-sm">
              {place.menu.slice(0, 2).flatMap((sec) =>
                sec.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3.5 py-3 border-b border-[#E5E7EB] last:border-b-0">
                    <div>
                      <div className="text-xs font-semibold text-[#111827]">{item.name}</div>
                      <div className="text-[10px] text-[#9CA3AF]">{sec.name}</div>
                    </div>
                    <div className="font-bold text-[13px] text-[#111827]">
                      {Number(item.price) > 0 ? `${item.price} ₪` : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ══ Bottom Nav ══ */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E5E7EB] flex items-center px-2 pb-2 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
        <NavItem icon="home" label="الرئيسية" active onClick={() => setSheet(null)} />
        {isWorkspace ? (
          <>
            <NavItem icon="menu" label="الأسعار" onClick={openWsDetails} />
            <NavItem icon="add" label="الخدمات" onClick={openWsServices} />
          </>
        ) : (
          <>
            <NavItem icon="menu" label="القائمة" onClick={() => setSheet("menu")} />
            <NavItem icon="add" label="إضافة" onClick={() => { setAddItemSection(place.menu[0]?.id ?? ""); setSheet("addItem"); }} />
          </>
        )}
        <NavItem icon="edit" label="تعديل" onClick={openEdit} />
      </div>

      {/* ══ SHEETS ══ */}

      {/* Menu Sheet */}
      <SheetWrap open={sheet === "menu"} onClose={() => setSheet(null)} title="إدارة القائمة" sub={`${totalItems} صنف في ${place.menu.length} أقسام`}>
        <div className="space-y-5">
          {place.menu.map((sec) => {
            const isSectionLoading = actionLoading === `delete-section-${sec.id}`;
            return (
            <div key={sec.id} className={`relative ${isSectionLoading ? "pointer-events-none opacity-50" : ""}`}>
              {isSectionLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-5 h-5 border-2 border-[#E05C35]/30 border-t-[#E05C35] rounded-full animate-spin" />
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#EBF3EE] mb-2">
                <span className="font-bold text-[13px] text-[#111827]">{sec.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setAddItemSection(sec.id); setSheet("addItem"); }}
                    className="text-[11px] font-bold text-[#4A7C59] bg-[#EBF3EE] rounded-full px-2.5 py-1"
                  >
                    + صنف
                  </button>
                  <button
                    onClick={() => handleDeleteSection(sec.id)}
                    disabled={!!actionLoading}
                    className="text-[11px] font-bold text-[#E05C35] bg-[#FEF2F2] rounded-full px-2 py-1"
                  >
                    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" />
                    </svg>
                  </button>
                </div>
              </div>
              {sec.items.map((item) => {
                const isItemLoading = actionLoading === `toggle-item-${item.id}` || actionLoading === `delete-item-${item.id}`;
                return (
                <div key={item.id} className={`bg-white border border-[#E5E7EB] rounded-2xl p-3 mb-1.5 relative ${!item.available ? "opacity-55" : ""} ${isItemLoading ? "pointer-events-none" : ""}`}>
                  {isItemLoading && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-10">
                      <div className="w-5 h-5 border-2 border-[#4A7C59]/30 border-t-[#4A7C59] rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#111827]">{item.name}</div>
                      {item.description && <div className="text-[10px] text-[#9CA3AF] mt-0.5">{item.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${Number(item.price) > 0 ? "text-[#4A7C59]" : "text-[#9CA3AF]"}`}>
                        {Number(item.price) > 0 ? `${item.price} ₪` : "—"}
                      </span>
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        disabled={!!actionLoading}
                        className={`w-9 h-5 rounded-full relative transition-colors ${item.available ? "bg-[#3A6347]" : "bg-[#E5E7EB]"}`}
                      >
                        <div className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${item.available ? "right-[19px]" : "right-[3px]"}`} />
                      </button>
                    </div>
                  </div>
                  {/* Edit / Delete row */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F3F4F6]">
                    <button
                      onClick={() => openEditItem(item)}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[#4A7C59] bg-[#EBF3EE] rounded-lg py-1.5"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z" />
                      </svg>
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#E05C35] bg-[#FEF2F2] rounded-lg py-1.5 px-3"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" />
                      </svg>
                      حذف
                    </button>
                  </div>
                </div>
                );
              })}
              {sec.items.length === 0 && (
                <div className="text-center text-[11px] text-[#9CA3AF] py-4">لا توجد أصناف في هذا القسم</div>
              )}
            </div>
          ); })}
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { setAddItemSection(place.menu[0]?.id ?? ""); setSheet("addItem"); }}
            className="flex-1 bg-[#4A7C59] text-white font-bold text-[13px] rounded-full py-3 flex items-center justify-center gap-1.5 shadow-lg shadow-[#4A7C59]/20"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>
            إضافة صنف
          </button>
          <button
            onClick={() => setSheet("addSection")}
            className="bg-[#EBF3EE] text-[#4A7C59] font-bold text-[13px] rounded-full py-3 px-5"
          >
            + قسم
          </button>
        </div>
      </SheetWrap>

      {/* Edit Sheet */}
      <SheetWrap open={sheet === "edit"} onClose={() => setSheet(null)} title={isWorkspace ? "تعديل بيانات المساحة" : "تعديل بيانات المحل"} sub="التغييرات تظهر فوراً للزوار">
        <div className="space-y-3.5">
          {/* Avatar upload */}
          <div>
            <label className="text-xs font-bold text-[#374151] mb-1.5 block">{isWorkspace ? "صورة المساحة" : "صورة المحل"}</label>
            <div className="flex items-center gap-3">
              <div className="w-[56px] h-[56px] rounded-[14px] bg-[#F3F4F6] border-2 border-dashed border-[#D1D5DB] flex items-center justify-center overflow-hidden flex-shrink-0">
                {place.avatar_url ? (
                  <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{place.section === "workspace" ? "💼" : place.section === "food" ? "🍽️" : "🏪"}</span>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="text-center py-2.5 rounded-xl border-[1.5px] border-[#E5E7EB] text-[12px] font-bold text-[#4A7C59] bg-[#EBF3EE] hover:bg-[#d9ede0] transition-colors">
                  {saving ? "جاري الرفع..." : "رفع صورة"}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || saving) return;
                    setSaving(true);
                    try {
                      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
                      const fd = new FormData();
                      fd.append("file", file);
                      const up = await fetch(`${base}/upload/avatar`, { method: "POST", body: fd });
                      const upData = await up.json();
                      if (upData.url) {
                        await apiFetch(`/api/places/dashboard/update?${qs}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ avatar_url: upData.url }),
                        });
                        await load();
                        showToast("تم تحديث الصورة ✓");
                      }
                    } catch { /* ignore */ } finally { setSaving(false); }
                  }}
                />
              </label>
            </div>
          </div>
          <FormField label={isWorkspace ? "اسم المساحة" : "اسم المحل"} value={editName} onChange={setEditName} />
          <div>
            <label className="text-xs font-bold text-[#374151] mb-1.5 block">المنطقة</label>
            <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none appearance-none focus:border-[#3A6347]">
              <option value="">اختر المنطقة...</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>
          </div>
          <FormField label="العنوان التفصيلي" value={editAddress} onChange={setEditAddress} textarea />
          <FormField label="رقم الهاتف" value={editPhone} onChange={setEditPhone} type="tel" />
          <FormField label="واتساب" value={editWhatsapp} onChange={setEditWhatsapp} type="tel" />
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </SheetWrap>

      {/* Add Item Sheet */}
      <SheetWrap open={sheet === "addItem"} onClose={() => setSheet("menu")} title="إضافة صنف جديد" sub="أضف صنف لقائمتك">
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-[#374151] mb-1.5 block">القسم</label>
            <select value={addItemSection} onChange={(e) => setAddItemSection(e.target.value)} className="w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none appearance-none focus:border-[#3A6347]">
              {place.menu.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <FormField label="اسم الصنف" value={addItemName} onChange={setAddItemName} placeholder="مثال: شاورما لحمة" />
          <FormField label="السعر (₪)" value={addItemPrice} onChange={setAddItemPrice} type="number" placeholder="0" />
          <FormField label="وصف (اختياري)" value={addItemDesc} onChange={setAddItemDesc} placeholder="وصف قصير..." />
          {/* Photo upload */}
          <div>
            <label className="text-xs font-bold text-[#374151] mb-1.5 block">صورة المنتج (اختياري)</label>
            {addItemPhoto ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E5E7EB]">
                <img src={addItemPhoto} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setAddItemPhoto("")} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-[#D1D5DB] rounded-xl py-4 cursor-pointer hover:border-[#4A7C59] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadProductPhoto(file);
                  if (url) setAddItemPhoto(url);
                  e.target.value = "";
                }} />
                {uploadingPhoto ? (
                  <span className="text-xs text-[#9CA3AF]">جاري الرفع...</span>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">اضغط لرفع صورة</span>
                )}
              </label>
            )}
          </div>
          <button
            onClick={handleAddItem}
            disabled={saving || !addItemName.trim() || uploadingPhoto}
            className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الإضافة..." : "إضافة الصنف"}
          </button>
        </div>
      </SheetWrap>

      {/* Add Section Sheet */}
      <SheetWrap open={sheet === "addSection"} onClose={() => setSheet("menu")} title="إضافة قسم جديد" sub="أنشئ قسم جديد لقائمتك">
        <div className="space-y-3.5">
          <FormField label="اسم القسم" value={addSectionName} onChange={setAddSectionName} placeholder="مثال: 🌅 فطور" />
          <button
            onClick={handleAddSection}
            disabled={saving || !addSectionName.trim()}
            className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الإضافة..." : "إضافة القسم"}
          </button>
        </div>
      </SheetWrap>

      {/* Edit Item Sheet */}
      <SheetWrap open={sheet === "editItem"} onClose={() => setSheet("menu")} title="تعديل الصنف" sub="عدّل الاسم أو السعر أو الوصف أو الصورة">
        <div className="space-y-3.5">
          <FormField label="اسم الصنف" value={editItemName} onChange={setEditItemName} />
          <FormField label="السعر (₪)" value={editItemPrice} onChange={setEditItemPrice} type="number" placeholder="0" />
          <FormField label="وصف (اختياري)" value={editItemDesc} onChange={setEditItemDesc} placeholder="وصف قصير..." />
          {/* Photo upload */}
          <div>
            <label className="text-xs font-bold text-[#374151] mb-1.5 block">صورة المنتج</label>
            {editItemPhoto ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E5E7EB]">
                <img src={editItemPhoto} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setEditItemPhoto("")} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-[#D1D5DB] rounded-xl py-4 cursor-pointer hover:border-[#4A7C59] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadProductPhoto(file);
                  if (url) setEditItemPhoto(url);
                  e.target.value = "";
                }} />
                {uploadingPhoto ? (
                  <span className="text-xs text-[#9CA3AF]">جاري الرفع...</span>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">اضغط لرفع صورة</span>
                )}
              </label>
            )}
          </div>
          <button
            onClick={handleUpdateItem}
            disabled={saving || !editItemName.trim() || uploadingPhoto}
            className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </SheetWrap>

      {/* Plans Sheet */}
      <SheetWrap open={sheet === "plans"} onClose={() => { setSheet(null); setSelectedPlan(null); }} title="الباقات" sub="اختر الباقة المناسبة لمحلك">
        <div className="space-y-3">
          {PLANS.map((p) => {
            const isCurrent = place.plan === p.key;
            const isSelected = selectedPlan === p.key;
            const isPaid = p.key !== "free";
            return (
              <div key={p.key} className={`bg-white rounded-2xl border-2 p-4 transition-all relative ${
                isSelected ? "border-[#4A7C59] shadow-lg shadow-[#4A7C59]/10" : p.featured ? "border-[#4A7C59] shadow-md shadow-[#4A7C59]/10" : "border-[#E5E7EB]"
              }`}>
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4A7C59] text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">الأكثر اختياراً</div>
                )}
                <div className="text-[11px] font-bold text-[#4A5E52] uppercase tracking-wide mb-1">{p.badge}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-black text-[#111827] leading-none">{p.price}</span>
                  <span className="text-[14px] font-bold text-[#4A5E52]">₪</span>
                  {p.price !== "0" && <span className="text-[11px] text-[#9CA3AF]">/ شهر</span>}
                </div>
                <div className="h-px bg-[#E5E7EB] my-3" />
                <div className="space-y-2 mb-3">
                  {FEATURES.map((f) => {
                    const has = f[p.key as keyof typeof f] as boolean;
                    return (
                      <div key={f.name} className={`flex items-start gap-2 text-[11px] ${has ? "text-[#374151]" : "text-[#9CA3AF]"}`}>
                        {has ? (
                          <span className="text-[#2D9E5F] font-bold text-xs mt-px flex-shrink-0">✓</span>
                        ) : (
                          <span className="text-[10px] mt-px flex-shrink-0">✕</span>
                        )}
                        {f.name}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSelectedPlan(isSelected ? null : p.key)}
                  className={`w-full py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                    isCurrent
                      ? "border-2 border-[#C2DBC9] text-[#4A7C59] bg-[#EBF3EE]"
                      : isSelected
                        ? "bg-[#4A7C59] text-white"
                        : p.featured
                          ? "bg-[#4A7C59] text-white shadow-md shadow-[#4A7C59]/25"
                          : "bg-[#F9FAFB] text-[#374151] border border-[#E5E7EB]"
                  }`}
                >
                  {isCurrent ? "باقتك الحالية ✓" : isSelected ? "تم الاختيار ✓" : `اشترك في ${p.badge}`}
                </button>

                {/* Payment inside card */}
                {isPaid && isSelected && !isCurrent && (
                  <div className="mt-3 pt-3 border-t border-[#C2DBC9] text-right">
                    <div className="bg-[#F9FAFB] rounded-xl p-3 mb-2">
                      <div className="text-[10px] text-[#9CA3AF] font-semibold mb-1.5">١. حوّل المبلغ عبر بنك فلسطين</div>
                      <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 flex items-center justify-between">
                        <span className="text-[15px] font-bold text-[#111827] tracking-wider" dir="ltr">0567359920</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("0567359920"); }}
                          className="text-[10px] text-[#4A7C59] font-bold bg-[#EBF3EE] rounded-lg px-2.5 py-1"
                        >
                          نسخ
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#F9FAFB] rounded-xl p-3">
                      <div className="text-[10px] text-[#9CA3AF] font-semibold mb-1.5">٢. أرسل إشعار التحويل للتأكيد</div>
                      <a
                        href={`https://wa.me/972567359920?text=${encodeURIComponent(`مرحباً، حوّلت ${p.price} شيكل لباقة ${p.badge} — اسم المحل: ${place.name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#25D366] text-white font-bold text-[13px] rounded-xl py-2.5 flex items-center justify-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.39 0-4.598-.788-6.379-2.117l-.446-.338-2.634.883.883-2.634-.338-.446A9.723 9.723 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z" />
                        </svg>
                        إرسال عبر واتساب
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetWrap>

      {/* Workspace Details Sheet */}
      <SheetWrap open={sheet === "wsDetails"} onClose={() => setSheet(null)} title="الأسعار والأوقات" sub="عدّل أسعار المساحة ومواعيد العمل">
        {wsLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#4A7C59] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="space-y-3.5">
          <div className="text-[11px] font-bold text-[#374151] mb-1">الأسعار (بالشيكل)</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="سعر الساعة" value={wsDetails.price_hour} onChange={(v) => setWsDetails(d => ({...d, price_hour: v}))} type="number" placeholder="0" />
            <FormField label="نصف يوم" value={wsDetails.price_half_day} onChange={(v) => setWsDetails(d => ({...d, price_half_day: v}))} type="number" placeholder="0" />
            <FormField label="يوم كامل" value={wsDetails.price_day} onChange={(v) => setWsDetails(d => ({...d, price_day: v}))} type="number" placeholder="0" />
            <FormField label="أسبوع" value={wsDetails.price_week} onChange={(v) => setWsDetails(d => ({...d, price_week: v}))} type="number" placeholder="0" />
          </div>
          <FormField label="سعر الشهر" value={wsDetails.price_month} onChange={(v) => setWsDetails(d => ({...d, price_month: v}))} type="number" placeholder="0" />

          <div className="h-px bg-[#E5E7EB] my-1" />
          <div className="text-[11px] font-bold text-[#374151] mb-1">أوقات العمل</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="يفتح الساعة" value={wsDetails.opens_at} onChange={(v) => setWsDetails(d => ({...d, opens_at: v}))} type="time" />
            <FormField label="يغلق الساعة" value={wsDetails.closes_at} onChange={(v) => setWsDetails(d => ({...d, closes_at: v}))} type="time" />
          </div>

          <div className="h-px bg-[#E5E7EB] my-1" />
          <div className="text-[11px] font-bold text-[#374151] mb-1">المقاعد</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="إجمالي المقاعد" value={wsDetails.total_seats} onChange={(v) => setWsDetails(d => ({...d, total_seats: v}))} type="number" placeholder="0" />
            <FormField label="المقاعد المتاحة" value={wsDetails.available_seats} onChange={(v) => setWsDetails(d => ({...d, available_seats: v}))} type="number" placeholder="0" />
          </div>

          <button onClick={handleSaveWsDetails} disabled={saving} className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-50 mt-2">
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
        )}
      </SheetWrap>

      {/* Workspace Services Sheet */}
      <SheetWrap open={sheet === "wsServices"} onClose={() => setSheet(null)} title="الخدمات المتاحة" sub="فعّل الخدمات المتوفرة في مساحتك">
        {wsLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#4A7C59] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="space-y-3">
          {wsServices.map((s, i) => (
            <div key={s.service} className={`bg-white border rounded-2xl p-4 transition-all ${s.available ? 'border-[#4A7C59]/30 bg-[#F2FAF5]' : 'border-[#E5E7EB]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[13px] text-[#111827]">{WS_SERVICE_LABELS[s.service] || s.service}</span>
                <button
                  onClick={() => setWsServices(prev => prev.map((ss, j) => j === i ? {...ss, available: !ss.available} : ss))}
                  className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${s.available ? "bg-[#4A7C59]" : "bg-[#E5E7EB]"}`}
                >
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${s.available ? "right-[25px]" : "right-[3px]"}`} />
                </button>
              </div>
              {s.available && (
                <input
                  value={s.detail}
                  onChange={(e) => setWsServices(prev => prev.map((ss, j) => j === i ? {...ss, detail: e.target.value} : ss))}
                  placeholder="تفاصيل إضافية (اختياري)..."
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[12px] text-[#111827] bg-white outline-none focus:border-[#4A7C59] placeholder:text-[#9CA3AF]"
                />
              )}
            </div>
          ))}
          <button onClick={handleSaveWsServices} disabled={saving} className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-50 mt-2">
            {saving ? "جاري الحفظ..." : "حفظ الخدمات"}
          </button>
        </div>
        )}
      </SheetWrap>

      {/* Footer */}
      <div className="text-center pb-20 px-4">
        <p className="text-[10px] text-[#9CA3AF]">غزة بريس 🌿 لوحة تحكم المالك</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white text-[13px] font-bold px-5 py-3 rounded-xl shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-[280px] shadow-xl text-center">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#E05C35" strokeWidth={2} strokeLinecap="round">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              </svg>
            </div>
            <p className="text-[13px] font-bold text-[#111827] mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold border border-[#E5E7EB] text-[#374151] bg-white"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-[#E05C35] text-white"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function ActionItem({ icon, iconBg, iconColor, title, sub, badge, onClick, last }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  title: string; sub: string; badge?: React.ReactNode;
  onClick?: () => void; last?: boolean;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-[#F2FAF5] active:bg-[#EBF3EE] ${last ? "" : "border-b border-[#E5E7EB]"}`}>
      <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${iconColor}`} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {(icon as React.ReactElement<{ children?: React.ReactNode }>).props.children}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13px] text-[#111827]">{title}</div>
        <div className="text-[11px] text-[#9CA3AF]">{sub}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {badge}
        <span className="text-[#9CA3AF] text-sm">‹</span>
      </div>
    </button>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    menu: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x={9} y={3} width={6} height={4} rx={2} /></>,
    add: <><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  };
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl transition-colors relative">
      {active && <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-10 h-7 bg-[#EBF3EE] rounded-[9px] z-0" />}
      <svg viewBox="0 0 24 24" className={`w-[18px] h-[18px] relative z-[1] ${active ? "stroke-[#4A7C59]" : "stroke-[#9CA3AF]"}`} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {icons[icon]}
      </svg>
      <span className={`text-[9px] font-bold relative z-[1] ${active ? "text-[#4A7C59]" : "text-[#9CA3AF]"}`}>{label}</span>
    </button>
  );
}

function SheetWrap({ open, onClose, title, sub, children }: {
  open: boolean; onClose: () => void; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <div className={`fixed inset-0 bg-[#F9FAFB] z-20 flex flex-col transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full pointer-events-none"}`} dir="rtl">
      <div className="bg-[#4A7C59] px-4 pt-4 pb-5 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-[130px] h-[130px] rounded-full bg-white/5 -bottom-10 -left-4" />
        <div className="flex items-center gap-2 mb-1 relative z-[1]">
          <button onClick={onClose} className="w-[30px] h-[30px] bg-white/10 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="font-bold text-sm text-white">{title}</span>
        </div>
        <div className="text-[11px] text-white/50 pr-[38px]">{sub}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#3A6347]";
  return (
    <div>
      <label className="text-xs font-bold text-[#374151] mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${cls} resize-none h-[72px]`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
