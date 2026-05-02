"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAreas } from "@/lib/queries/hooks";
import { apiFetch } from "@/lib/api/fetch";
import { DashboardOrders } from "@/components/places/DashboardOrders";
import { DashboardDiscountCodes } from "@/components/places/DashboardDiscountCodes";
import { DashboardNotifications } from "@/components/places/DashboardNotifications";

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
  orders_enabled?: boolean;
};
type WorkspaceDetailsForm = {
  price_hour: string; price_half_day: string; price_day: string; price_week: string; price_month: string;
  total_seats: string; available_seats: string; opens_at: string; closes_at: string;
};
type WorkspaceServiceForm = { service: string; available: boolean; detail: string };
type Sheet = null | "menu" | "edit" | "plans" | "addItem" | "addSection" | "editItem" | "wsDetails" | "wsServices";

const STORE_CATEGORIES = [
  { label: "مواد غذائية وبقالة", icon: "🛒", types: ["بقالية عامة", "سوبرماركت", "خضار وفواكه", "لحوم", "سمك", "مخبز", "حلويات ومعجنات", "بهارات وتوابل"] },
  { label: "صحة وصيدلية", icon: "💊", types: ["صيدلية", "عيادة وطب", "مستلزمات طبية", "بصريات"] },
  { label: "ملابس وأزياء", icon: "👕", types: ["ملابس رجالي", "ملابس حريمي", "ملابس أطفال", "أحذية", "إكسسوارات", "خياطة وتعديل"] },
  { label: "منزل وأثاث", icon: "🏠", types: ["أثاث منزلي", "مفروشات وستائر", "أدوات منزلية", "كهرباء ولوازم منزلية", "نظافة ومنظفات", "أدوات صحية وسباكة"] },
  { label: "إلكترونيات وتقنية", icon: "📱", types: ["موبايل وإكسسوارات", "كمبيوتر ولاب توب", "كهربائيات", "طاقة شمسية", "إصلاح وصيانة"] },
  { label: "بناء ومواد", icon: "🏗️", types: ["مواد بناء", "حديد وألمنيوم", "دهانات وديكور", "أخشاب", "سيراميك وبلاط"] },
  { label: "تعليم وثقافة", icon: "📚", types: ["مكتبة وقرطاسية", "ألعاب أطفال", "أدوات رسم وفنون"] },
  { label: "خدمات شخصية", icon: "💈", types: ["حلاقة وصالون", "عطور وكوزمتيك", "تصوير"] },
  { label: "سيارات", icon: "🚗", types: ["قطع غيار سيارات", "كراج وميكانيك", "إطارات"] },
  { label: "زراعة وحيوانات", icon: "🌿", types: ["مستلزمات زراعية", "علف وبيطري"] },
  { label: "أخرى", icon: "📦", types: ["أخرى"] },
];
const STORE_TYPE_VALUES = Array.from(new Set(STORE_CATEGORIES.flatMap((c) => c.types)));

/* ── Plan data ── */
const PLANS = [
  { key: "free", badge: "مجاني", name: "Free", price: "0", badgeClass: "bg-[var(--d-subtle-bg)] text-[var(--d-text-sec)]", featured: false },
  { key: "basic", badge: "أساسي", name: "Basic", price: "100", badgeClass: "bg-[var(--d-green-bg)] text-[var(--d-green)]", featured: false },
  { key: "premium", badge: "الأفضل", name: "Premium", price: "200", badgeClass: "bg-[var(--d-green)] text-white", featured: true },
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
        <div className="min-h-screen bg-[#0F1117] flex items-center justify-center" dir="rtl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--d-green)] border-t-transparent" />
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
  const [lastOrderEvent, setLastOrderEvent] = useState<{ type: "order_created" | "order_updated"; order: any } | null>(null);

  const handleOrderEvent = useCallback((type: "order_created" | "order_updated", order: any) => {
    setLastOrderEvent({ type, order });
  }, []);
  const [activeView, setActiveView] = useState<"menu" | "orders" | "discounts" | "edit">("orders");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboardTheme") !== "light";
    }
    return true;
  });

  // Edit form
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [editStoreType, setEditStoreType] = useState("");
  const [saving, setSaving] = useState(false);

  // Add item form
  const [addItemSection, setAddItemSection] = useState("");
  const [addItemName, setAddItemName] = useState("");
  const [addItemPrice, setAddItemPrice] = useState("");
  const [addItemDesc, setAddItemDesc] = useState("");
  const [addItemPhoto, setAddItemPhoto] = useState("");
  const [addItemPhotoPreview, setAddItemPhotoPreview] = useState("");

  // Add section form
  const [addSectionName, setAddSectionName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Edit item form
  const [editItemId, setEditItemId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemPhoto, setEditItemPhoto] = useState("");
  const [editItemPhotoPreview, setEditItemPhotoPreview] = useState("");
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
  const itemNamePlaceholder = place?.section === "store"
    ? "مثال: اسم المنتج"
    : place?.type === "cafe"
      ? "مثال: قهوة تركية"
      : place?.type === "restaurant" || place?.type === "both"
        ? "مثال: شاورما لحمة"
        : isWorkspace
          ? "مثال: ساعة عمل مشتركة"
          : "مثال: اسم الصنف";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function normalizeImageUrl(url?: string | null): string {
    if (!url) return "";
    let out = url.trim();
    if (!/^https?:\/\//i.test(out)) {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      if (base) out = `${base}${out.startsWith("/") ? out : `/${out}`}`;
    }
    // Avoid mixed-content blocking when app runs on HTTPS.
    if (typeof window !== "undefined" && window.location.protocol === "https:" && out.startsWith("http://")) {
      out = out.replace(/^http:\/\//i, "https://");
    }
    return out;
  }

  async function compressImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    // Keep unsupported/animated formats untouched.
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
    // Small images don't need compression.
    if (file.size <= 500 * 1024) return file;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      const drawFromImage = async () => {
        const imageUrl = URL.createObjectURL(file);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = imageUrl;
          });
          const maxSide = 1024;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      };

      try {
        const bitmap = await createImageBitmap(file);
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } catch {
        // iOS/Safari may fail on some formats with createImageBitmap.
        await drawFromImage();
      }

      // For weak internet: target a very light file (~300KB).
      const targetSize = 320 * 1024;
      const qualitySteps = [0.68, 0.58, 0.5, 0.42, 0.35];
      let blob: Blob | null = null;
      let attempts = 0;
      while (attempts < 4) {
        for (const q of qualitySteps) {
          blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", q)
          );
          if (!blob) break;
          if (blob.size <= targetSize) break;
        }
        if (!blob) return file;
        if (blob.size <= targetSize) break;
        // If still too big, downscale further and retry encoding.
        const nextW = Math.max(480, Math.round(canvas.width * 0.8));
        const nextH = Math.max(480, Math.round(canvas.height * 0.8));
        const tmp = document.createElement("canvas");
        tmp.width = nextW;
        tmp.height = nextH;
        const tctx = tmp.getContext("2d");
        if (!tctx) break;
        tctx.drawImage(canvas, 0, 0, nextW, nextH);
        canvas.width = nextW;
        canvas.height = nextH;
        ctx.clearRect(0, 0, nextW, nextH);
        ctx.drawImage(tmp, 0, 0);
        attempts += 1;
      }
      if (!blob) return file;

      if (blob.size >= file.size) return file;
      const safeName = file.name.replace(/\.[^.]+$/, "");
      return new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });
    } catch {
      // Some formats (e.g. HEIC in unsupported browsers) may fail decode.
      return file;
    }
  }

  async function uploadProductPhoto(file: File): Promise<string | null> {
    setUploadingPhoto(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      const prepared = await compressImageForUpload(file);
      const fd = new FormData();
      fd.append("file", prepared);
      const uploadOnce = async () => {
        const res = await fetch(`${base}/upload/product`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        return { res, data };
      };
      let { res, data } = await uploadOnce();
      // One quick retry helps flaky mobile connections.
      if (!res.ok && (res.status >= 500 || res.status === 429)) {
        await new Promise((r) => setTimeout(r, 900));
        ({ res, data } = await uploadOnce());
      }
      if (res.ok && data.url) return normalizeImageUrl(data.url);
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
    setEditStoreType(place.type ?? "");
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

  async function handleToggleOrders() {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/places/dashboard/toggle-orders?${qs}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success && place) {
        setPlace({ ...place, orders_enabled: data.orders_enabled });
        showToast(data.orders_enabled ? "استقبال الطلبات مفعّل ✓" : "تم إيقاف استقبال الطلبات");
      }
    } catch { showToast("حدث خطأ"); }
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
      if (place?.section === "store" && editStoreType && editStoreType !== place?.type) body.type = editStoreType;
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
    setEditItemPhotoPreview("");
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
      setAddItemName(""); setAddItemPrice(""); setAddItemDesc(""); setAddItemPhoto(""); setAddItemPhotoPreview("");
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
    <div className="min-h-screen bg-[var(--d-subtle-bg)] flex items-center justify-center" dir="rtl">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--d-green)] border-t-transparent" />
    </div>
  );
  if (error || !place) return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-lg font-bold text-[#E5E7EB] mb-2">{error ?? "رمز غير صحيح"}</h1>
        <p className="text-sm text-[var(--d-text-muted)]">تأكد من الرابط الذي حصلت عليه من فريق غزة بريس.</p>
      </div>
    </div>
  );

  const totalItems = place.menu.reduce((a, s) => a + s.items.length, 0);
  const availableItems = place.menu.reduce((a, s) => a + s.items.filter((i) => i.available).length, 0);
  const planLabels: Record<string, string> = { free: "مجانية", basic: "أساسية", premium: "مميزة" };

  // Theme colors
  const t = isDark ? {
    pageBg: "#0F1117", card: "#1A1D27", border: "#2A2D37", cardHover: "#252830",
    text: "#E5E7EB", textSec: "#9CA3AF", textMuted: "#6B7280",
    green: "#5B9A6A", greenBg: "#1A2E22", greenBgHover: "#243A2C",
    indigoBg: "#1E2340", grayBg: "#1E2128", subtleBg: "#252830",
    redBg: "#2D1B1B", toggleOff: "#374151", navShadow: "rgba(0,0,0,0.3)",
    sheetBg: "#0F1117", inputBg: "#252830", inputBorder: "#2A2D37",
    cancelBg: "#252830", overlayBg: "#1A1D27",
  } : {
    pageBg: "#F9FAFB", card: "#ffffff", border: "#E5E7EB", cardHover: "#F2FAF5",
    text: "#111827", textSec: "#374151", textMuted: "#9CA3AF",
    green: "#4A7C59", greenBg: "#EBF3EE", greenBgHover: "#DCE9E0",
    indigoBg: "#EEF2FF", grayBg: "#F1F5F9", subtleBg: "#F3F4F6",
    redBg: "#FEF2F2", toggleOff: "#E5E7EB", navShadow: "rgba(0,0,0,0.05)",
    sheetBg: "#F9FAFB", inputBg: "#ffffff", inputBorder: "#E5E7EB",
    cancelBg: "#ffffff", overlayBg: "#ffffff",
  };

  return (
    <div className="min-h-screen relative" dir="rtl" style={{
      "--d-page": t.pageBg, "--d-card": t.card, "--d-border": t.border, "--d-card-hover": t.cardHover,
      "--d-text": t.text, "--d-text-sec": t.textSec, "--d-text-muted": t.textMuted,
      "--d-green": t.green, "--d-green-bg": t.greenBg, "--d-green-bg-hover": t.greenBgHover,
      "--d-indigo-bg": t.indigoBg, "--d-gray-bg": t.grayBg, "--d-subtle-bg": t.subtleBg,
      "--d-red-bg": t.redBg, "--d-toggle-off": t.toggleOff, "--d-input-bg": t.inputBg,
      "--d-input-border": t.inputBorder, "--d-cancel-bg": t.cancelBg, "--d-overlay": t.overlayBg,
      backgroundColor: t.pageBg, color: t.text,
    } as React.CSSProperties}>
      {/* ══ GREEN HEADER ══ */}
      <div className="bg-[var(--d-green)] px-4 pt-4 pb-5 relative z-[10] lg:pt-3 lg:pb-4 lg:px-8">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-white/5 -top-[70px] -left-[50px]" />
        <div className="absolute w-[120px] h-[120px] rounded-full bg-white/[0.04] -bottom-10 -right-5" />

        {/* Top bar */}
        <div className="max-w-[1100px] mx-auto lg:px-8">
          <div className="flex items-center justify-between mb-4 lg:mb-0 relative z-[1]">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="w-8 h-8 rounded-full" />
              <span className="font-bold text-xl text-white leading-none">
                غزة <span className="text-[#C9A96E]">بريس</span>
              </span>
            </a>
            <div className="flex items-center gap-2">
              <DashboardNotifications token={token!} ordersEnabled={place.orders_enabled ?? false} onOrderEvent={handleOrderEvent} />
              <button
                onClick={() => { const next = !isDark; setIsDark(next); localStorage.setItem("dashboardTheme", next ? "dark" : "light"); }}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors"
                title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {isDark ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={5}/><line x1={12} y1={1} x2={12} y2={3}/><line x1={12} y1={21} x2={12} y2={23}/><line x1={4.22} y1={4.22} x2={5.64} y2={5.64}/><line x1={18.36} y1={18.36} x2={19.78} y2={19.78}/><line x1={1} y1={12} x2={3} y2={12}/><line x1={21} y1={12} x2={23} y2={12}/><line x1={4.22} y1={19.78} x2={5.64} y2={18.36}/><line x1={18.36} y1={5.64} x2={19.78} y2={4.22}/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                )}
              </button>
              <span className="text-[10px] font-bold text-white/50 bg-white/10 rounded-full px-2.5 py-1 lg:text-xs lg:px-4 lg:py-1.5">لوحة التحكم</span>
            </div>
          </div>

          {/* Place identity — mobile only in header */}
          <div className="flex items-center gap-3 mb-4 relative z-[1] lg:hidden">
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
      </div>

      {/* ══ MOBILE LAYOUT ══ */}
      <div className="lg:hidden px-4 py-4 pb-24">
        {/* Open toggle */}
        <div className="flex items-center justify-between bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3 -mt-6 mb-3 relative z-[2] shadow-sm">
          <div>
            <div className={`font-bold text-[13px] ${place.is_open ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>
              {place.is_open ? `● ${isWorkspace ? 'المساحة مفتوحة' : 'المحل مفتوح'} الآن` : `○ ${isWorkspace ? 'المساحة مغلقة' : 'المحل مغلق'} الآن`}
            </div>
            <div className="text-[10px] text-[var(--d-text-muted)]">
              {place.is_open ? 'يظهر للزوار كـ "مفتوح"' : 'يظهر للزوار كـ "مغلق"'}
            </div>
          </div>
          <button onClick={handleToggleOpen} disabled={toggling} className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${place.is_open ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}>
            {actionLoading === "toggle-open" ? (
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /></div>
            ) : (
              <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${place.is_open ? "right-[25px]" : "right-[3px]"}`} />
            )}
          </button>
        </div>
        {/* Stats */}
        {!isWorkspace && (
          <div className="grid grid-cols-3 gap-2.5 mb-4 relative z-[2]">
            {[{ num: place.menu.length, label: "أقسام" }, { num: totalItems, label: "صنف" }, { num: availableItems, label: "متوفر" }].map((s) => (
              <div key={s.label} className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl py-3 px-2 text-center shadow-sm">
                <div className="font-bold text-[22px] text-[var(--d-text)] leading-none mb-1">{s.num}</div>
                <div className="text-[9px] text-[var(--d-text-muted)] font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        {/* Plan */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--d-text-muted)] font-semibold">الباقة:</span>
            <span className="text-[11px] font-bold py-1 px-2.5 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">{planLabels[place.plan] ?? place.plan}</span>
          </div>
          <button onClick={() => setSheet("plans")} className="text-[11px] font-bold text-[var(--d-green)]">ترقية ←</button>
        </div>
        {/* Actions */}
        <div className="text-[13px] font-bold text-[var(--d-text-muted)] mb-2.5 pr-0.5">الإجراءات</div>
        <div className="bg-[var(--d-card)] rounded-[18px] border border-[var(--d-border)] overflow-hidden shadow-sm mb-4">
          {isWorkspace ? (
            <>
              <ActionItem icon={<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>} iconBg="bg-[var(--d-green-bg)]" iconColor="stroke-[var(--d-green)]" title="الأسعار والأوقات" sub="أسعار الساعة/اليوم، مواعيد العمل، المقاعد" onClick={openWsDetails} />
              <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>} iconBg="bg-[var(--d-indigo-bg)]" iconColor="stroke-[var(--d-green)]" title="الخدمات المتاحة" sub="WiFi، كهرباء، طباعة، شاشات، مشروبات" onClick={openWsServices} />
            </>
          ) : (
            <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x={9} y={3} width={6} height={4} rx={2} /><line x1={9} y1={12} x2={15} y2={12} /><line x1={9} y1={16} x2={13} y2={16} /></svg>} iconBg="bg-[var(--d-green-bg)]" iconColor="stroke-[var(--d-green)]" title="إدارة القائمة" sub={`${totalItems} صنف — تعديل الأسعار والتوفر`} badge={<span className="text-[9px] font-bold py-1 px-2 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">{totalItems} صنف</span>} onClick={() => setSheet("menu")} />
          )}
          {place.section === "food" && token && (
            <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M16 10a4 4 0 01-8 0"/></svg>} iconBg="bg-amber-50" iconColor="stroke-amber-600" title="الطلبات" sub="إدارة طلبات الزبائن وتحديث حالتها" onClick={() => document.getElementById("mobile-orders")?.scrollIntoView({ behavior: "smooth" })} />
          )}
          {place.section === "food" && token && (
            <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1={7} y1={7} x2={7.01} y2={7}/></svg>} iconBg="bg-violet-50" iconColor="stroke-violet-600" title="اكواد الخصم" sub="إنشاء وإدارة أكواد الخصم" onClick={() => document.getElementById("mobile-discounts")?.scrollIntoView({ behavior: "smooth" })} />
          )}
          <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>} iconBg="bg-[var(--d-indigo-bg)]" iconColor="stroke-[var(--d-green)]" title={isWorkspace ? "تعديل بيانات المساحة" : "تعديل بيانات المحل"} sub="اسم، منطقة، هاتف، واتساب" onClick={openEdit} />
          <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1={12} y1={2} x2={12} y2={15} /></svg>} iconBg="bg-[var(--d-gray-bg)]" iconColor="stroke-[var(--d-text-sec)]" title={isWorkspace ? "مشاركة صفحة المساحة" : "مشاركة صفحة المحل"} sub={isWorkspace ? "شارك رابط مساحتك مع العملاء" : "شارك رابط محلك مع الزبائن"} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/places/${place.id}`); showToast("تم نسخ الرابط ✓"); }} last />
        </div>
        {/* Menu preview */}
        {!isWorkspace && place.menu.length > 0 && (
          <>
            <div className="text-[13px] font-bold text-[var(--d-text-muted)] mb-2.5 pr-0.5">القائمة</div>
            <div className="bg-[var(--d-card)] rounded-[14px] border border-[var(--d-border)] overflow-hidden shadow-sm">
              {place.menu.slice(0, 2).flatMap((sec) => sec.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--d-border)] last:border-b-0">
                  <div><div className="text-xs font-semibold text-[var(--d-text)]">{item.name}</div><div className="text-[10px] text-[var(--d-text-muted)]">{sec.name}</div></div>
                  <div className="font-bold text-[13px] text-[var(--d-text)]">{Number(item.price) > 0 ? `${item.price} ₪` : "—"}</div>
                </div>
              )))}
            </div>
          </>
        )}
        {place.section === "food" && token && (
          <div id="mobile-orders" className="mt-4 bg-[var(--d-card)] rounded-[18px] border border-[var(--d-border)] p-4 shadow-sm">
            <DashboardOrders token={token} ordersEnabled={place.orders_enabled ?? false} onToggleOrders={handleToggleOrders} lastEvent={lastOrderEvent} />
          </div>
        )}
        {place.section === "food" && token && (
          <div id="mobile-discounts" className="mt-4 bg-[var(--d-card)] rounded-[18px] border border-[var(--d-border)] p-4 shadow-sm">
            <DashboardDiscountCodes token={token} />
          </div>
        )}
      </div>

      {/* ══ DESKTOP LAYOUT — sidebar right + content left, centered ══ */}
      <div className="hidden lg:flex max-w-[1100px] mx-auto px-8 pt-8 pb-6 gap-6 items-start relative z-[2]">

        {/* ── RIGHT SIDEBAR ── */}
        <div className="w-[320px] flex-shrink-0 sticky top-6 space-y-4">
          {/* Place identity card */}
          <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] shadow-sm p-5">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-[56px] h-[56px] rounded-2xl bg-[var(--d-subtle-bg)] border border-[var(--d-border)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                {place.avatar_url ? (
                  <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : place.section === "workspace" ? "💼" : place.section === "food" ? "🍽️" : "🏪"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[15px] text-[var(--d-text)] truncate">{place.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {place.area && <span className="text-[11px] text-[var(--d-text-muted)]">📍 {place.area.name_ar}</span>}
                  <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-[var(--d-subtle-bg)] text-[var(--d-text-muted)]">{place.type}</span>
                </div>
              </div>
            </div>
            {/* Toggle */}
            <div className="flex items-center justify-between bg-[var(--d-subtle-bg)] rounded-xl p-3">
              <div>
                <div className={`font-bold text-[13px] ${place.is_open ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>
                  {place.is_open ? `● ${isWorkspace ? 'المساحة مفتوحة' : 'المحل مفتوح'}` : `○ ${isWorkspace ? 'المساحة مغلقة' : 'المحل مغلق'}`}
                </div>
                <div className="text-[10px] text-[var(--d-text-muted)]">
                  {place.is_open ? 'يظهر كـ "مفتوح"' : 'يظهر كـ "مغلق"'}
                </div>
              </div>
              <button onClick={handleToggleOpen} disabled={toggling} className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${place.is_open ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}>
                {actionLoading === "toggle-open" ? (
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /></div>
                ) : (
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${place.is_open ? "right-[25px]" : "right-[3px]"}`} />
                )}
              </button>
            </div>
          </div>

          {/* Stats */}
          {!isWorkspace && (
            <div className="grid grid-cols-3 gap-3">
              {[{ num: place.menu.length, label: "أقسام" }, { num: totalItems, label: "صنف" }, { num: availableItems, label: "متوفر" }].map((s) => (
                <div key={s.label} className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl py-4 px-2 text-center shadow-sm">
                  <div className="font-bold text-[24px] text-[var(--d-text)] leading-none mb-1">{s.num}</div>
                  <div className="text-[10px] text-[var(--d-text-muted)] font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Plan */}
          <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] shadow-sm px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--d-text-muted)] font-semibold">الباقة:</span>
              <span className="text-xs font-bold py-1 px-2.5 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">{planLabels[place.plan] ?? place.plan}</span>
            </div>
            <button onClick={() => setSheet("plans")} className="text-xs font-bold text-[var(--d-green)] hover:underline">ترقية ←</button>
          </div>

          {/* Actions */}
          <div>
            <div className="text-sm font-bold text-[var(--d-text-muted)] mb-2 pr-0.5">الإجراءات</div>
            <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] overflow-hidden shadow-sm">
              {place.section === "food" && token && (
                <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M16 10a4 4 0 01-8 0"/></svg>} iconBg="bg-amber-50" iconColor="stroke-amber-600" title="الطلبات" sub="إدارة طلبات الزبائن وتحديث حالتها" onClick={() => setActiveView("orders")} active={activeView === "orders"} />
              )}
              {isWorkspace ? (
                <>
                  <ActionItem icon={<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>} iconBg="bg-[var(--d-green-bg)]" iconColor="stroke-[var(--d-green)]" title="الأسعار والأوقات" sub="أسعار الساعة/اليوم، مواعيد العمل" onClick={openWsDetails} />
                  <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>} iconBg="bg-[var(--d-indigo-bg)]" iconColor="stroke-[var(--d-green)]" title="الخدمات المتاحة" sub="WiFi، كهرباء، طباعة، مشروبات" onClick={openWsServices} />
                </>
              ) : (
                <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x={9} y={3} width={6} height={4} rx={2} /><line x1={9} y1={12} x2={15} y2={12} /><line x1={9} y1={16} x2={13} y2={16} /></svg>} iconBg="bg-[var(--d-green-bg)]" iconColor="stroke-[var(--d-green)]" title="إدارة القائمة" sub={`${totalItems} صنف — تعديل الأسعار والتوفر`} badge={<span className="text-[9px] font-bold py-1 px-2 rounded-full bg-[var(--d-green-bg)] text-[var(--d-green)]">{totalItems} صنف</span>} onClick={() => setActiveView("menu")} active={activeView === "menu"} />
              )}
              {place.section === "food" && token && (
                <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1={7} y1={7} x2={7.01} y2={7}/></svg>} iconBg="bg-violet-50" iconColor="stroke-violet-600" title="اكواد الخصم" sub="إنشاء وإدارة أكواد الخصم" onClick={() => setActiveView("discounts")} active={activeView === "discounts"} />
              )}
              <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>} iconBg="bg-[var(--d-indigo-bg)]" iconColor="stroke-[var(--d-green)]" title={isWorkspace ? "تعديل بيانات المساحة" : "تعديل بيانات المحل"} sub="اسم، منطقة، هاتف، واتساب" onClick={() => { setEditName(place.name); setEditAddress(place.address ?? ""); setEditPhone(place.phone ?? ""); setEditWhatsapp(place.whatsapp ?? ""); setEditAreaId(place.area_id ?? place.area?.id ?? ""); setEditStoreType(place.type ?? ""); setActiveView("edit"); }} active={activeView === "edit"} />
              <ActionItem icon={<svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1={12} y1={2} x2={12} y2={15} /></svg>} iconBg="bg-[var(--d-gray-bg)]" iconColor="stroke-[var(--d-text-sec)]" title={isWorkspace ? "مشاركة صفحة المساحة" : "مشاركة صفحة المحل"} sub={isWorkspace ? "شارك رابط مساحتك" : "شارك رابط محلك"} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/places/${place.id}`); showToast("تم نسخ الرابط ✓"); }} last />
            </div>
          </div>

        </div>

        {/* ── LEFT MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Menu management — inline on desktop */}
          {activeView === "menu" && !isWorkspace && (
            <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[15px] text-[var(--d-text)]">إدارة القائمة</h3>
                  <p className="text-[11px] text-[var(--d-text-muted)]">{totalItems} صنف في {place.menu.length} أقسام</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setAddItemSection(place.menu[0]?.id ?? ""); setSheet("addItem"); }} className="text-[11px] font-bold text-white bg-[var(--d-green)] rounded-full px-3 py-1.5">+ صنف</button>
                  <button onClick={() => setSheet("addSection")} className="text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-full px-3 py-1.5">+ قسم</button>
                </div>
              </div>
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
                      <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--d-border)] mb-2">
                        <span className="font-bold text-[13px] text-[var(--d-text)]">{sec.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setAddItemSection(sec.id); setSheet("addItem"); }} className="text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-full px-2.5 py-1">+ صنف</button>
                          <button onClick={() => handleDeleteSection(sec.id)} disabled={!!actionLoading} className="text-[11px] font-bold text-[#E05C35] bg-[var(--d-red-bg)] rounded-full px-2 py-1">
                            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" /></svg>
                          </button>
                        </div>
                      </div>
                      {sec.items.map((item) => {
                        const isItemLoading = actionLoading === `toggle-item-${item.id}` || actionLoading === `delete-item-${item.id}`;
                        return (
                          <div key={item.id} className={`bg-[var(--d-subtle-bg)] border border-[var(--d-border)] rounded-2xl p-3 mb-1.5 relative ${!item.available ? "opacity-55" : ""} ${isItemLoading ? "pointer-events-none" : ""}`}>
                            {isItemLoading && (
                              <div className="absolute inset-0 bg-[var(--d-card)]/70 rounded-2xl flex items-center justify-center z-10">
                                <div className="w-5 h-5 border-2 border-[var(--d-green)]/30 border-t-[var(--d-green)] rounded-full animate-spin" />
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold text-[var(--d-text)]">{item.name}</div>
                                {item.description && <div className="text-[10px] text-[var(--d-text-muted)] mt-0.5">{item.description}</div>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${Number(item.price) > 0 ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>
                                  {Number(item.price) > 0 ? `${item.price} ₪` : "—"}
                                </span>
                                <button onClick={() => handleToggleItem(item.id)} disabled={!!actionLoading} className={`w-9 h-5 rounded-full relative transition-colors ${item.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}>
                                  <div className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${item.available ? "right-[19px]" : "right-[3px]"}`} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--d-border)]">
                              <button onClick={() => openEditItem(item)} disabled={!!actionLoading} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-lg py-1.5">
                                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z" /></svg>
                                تعديل
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)} disabled={!!actionLoading} className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#E05C35] bg-[var(--d-red-bg)] rounded-lg py-1.5 px-3">
                                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" /></svg>
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {sec.items.length === 0 && (
                        <div className="text-center text-[11px] text-[var(--d-text-muted)] py-4">لا توجد أصناف في هذا القسم</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === "orders" && place.section === "food" && token && (
            <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-5 shadow-sm">
              <DashboardOrders token={token} ordersEnabled={place.orders_enabled ?? false} onToggleOrders={handleToggleOrders} lastEvent={lastOrderEvent} />
            </div>
          )}

          {activeView === "discounts" && place.section === "food" && token && (
            <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-5 shadow-sm">
              <DashboardDiscountCodes token={token} />
            </div>
          )}

          {/* Edit place info — inline on desktop */}
          {activeView === "edit" && (
            <div className="bg-[var(--d-card)] rounded-2xl border border-[var(--d-border)] p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-bold text-[15px] text-[var(--d-text)]">{isWorkspace ? "تعديل بيانات المساحة" : "تعديل بيانات المحل"}</h3>
                <p className="text-[11px] text-[var(--d-text-muted)]">التغييرات تظهر فوراً للزوار</p>
              </div>
              <div className="space-y-3.5">
                {/* Avatar upload */}
                <div>
                  <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">{isWorkspace ? "صورة المساحة" : "صورة المحل"}</label>
                  <div className="flex items-center gap-3">
                    <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--d-subtle-bg)] border-2 border-dashed border-[var(--d-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {place.avatar_url ? (
                        <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{place.section === "workspace" ? "💼" : place.section === "food" ? "🍽️" : "🏪"}</span>
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <div className="text-center py-2.5 rounded-xl border-[1.5px] border-[var(--d-border)] text-[12px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] hover:bg-[var(--d-green-bg-hover)] transition-colors">
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
                            const compressed = await compressImageForUpload(file);
                            const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
                            const fd = new FormData();
                            fd.append("file", compressed);
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
                {place.section === "store" && (
                  <div>
                    <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">
                      نوع المتجر <span className="text-[#E05C35] text-[11px]">*</span>
                    </label>
                    <select
                      value={editStoreType}
                      onChange={(e) => setEditStoreType(e.target.value)}
                      className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]"
                    >
                      <option value="">اختر نوع المتجر...</option>
                      {STORE_CATEGORIES.map((cat) => (
                        <optgroup key={cat.label} label={`${cat.icon} ${cat.label}`}>
                          {cat.types.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">المنطقة</label>
                  <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]">
                    <option value="">اختر المنطقة...</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                  </select>
                </div>
                <FormField label="العنوان التفصيلي" value={editAddress} onChange={setEditAddress} textarea />
                <FormField label="رقم الهاتف" value={editPhone} onChange={setEditPhone} type="tel" />
                <FormField label="واتساب" value={editWhatsapp} onChange={setEditWhatsapp} type="tel" />
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || (place.section === "store" && !STORE_TYPE_VALUES.includes(editStoreType))}
                  className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
                >
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Bottom Nav (mobile) / Sidebar (desktop) ══ */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--d-card)] border-t border-[var(--d-border)] flex items-center px-2 pb-2 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.3)] lg:hidden">
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
              <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--d-border)] mb-2">
                <span className="font-bold text-[13px] text-[var(--d-text)]">{sec.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setAddItemSection(sec.id); setSheet("addItem"); }}
                    className="text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-full px-2.5 py-1"
                  >
                    + صنف
                  </button>
                  <button
                    onClick={() => handleDeleteSection(sec.id)}
                    disabled={!!actionLoading}
                    className="text-[11px] font-bold text-[#E05C35] bg-[var(--d-red-bg)] rounded-full px-2 py-1"
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
                <div key={item.id} className={`bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-3 mb-1.5 relative ${!item.available ? "opacity-55" : ""} ${isItemLoading ? "pointer-events-none" : ""}`}>
                  {isItemLoading && (
                    <div className="absolute inset-0 bg-[var(--d-card)]/70 rounded-2xl flex items-center justify-center z-10">
                      <div className="w-5 h-5 border-2 border-[var(--d-green)]/30 border-t-[var(--d-green)] rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--d-text)]">{item.name}</div>
                      {item.description && <div className="text-[10px] text-[var(--d-text-muted)] mt-0.5">{item.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${Number(item.price) > 0 ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>
                        {Number(item.price) > 0 ? `${item.price} ₪` : "—"}
                      </span>
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        disabled={!!actionLoading}
                        className={`w-9 h-5 rounded-full relative transition-colors ${item.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}
                      >
                        <div className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${item.available ? "right-[19px]" : "right-[3px]"}`} />
                      </button>
                    </div>
                  </div>
                  {/* Edit / Delete row */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--d-border)]">
                    <button
                      onClick={() => openEditItem(item)}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] rounded-lg py-1.5"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M11.33 2a1.88 1.88 0 012.67 2.67L5.33 13.33 2 14l.67-3.33z" />
                      </svg>
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#E05C35] bg-[var(--d-red-bg)] rounded-lg py-1.5 px-3"
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
                <div className="text-center text-[11px] text-[var(--d-text-muted)] py-4">لا توجد أصناف في هذا القسم</div>
              )}
            </div>
          ); })}
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { setAddItemSection(place.menu[0]?.id ?? ""); setSheet("addItem"); }}
            className="flex-1 bg-[var(--d-green)] text-white font-bold text-[13px] rounded-full py-3 flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--d-green)]/20"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>
            إضافة صنف
          </button>
          <button
            onClick={() => setSheet("addSection")}
            className="bg-[var(--d-green-bg)] text-[var(--d-green)] font-bold text-[13px] rounded-full py-3 px-5"
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
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">{isWorkspace ? "صورة المساحة" : "صورة المحل"}</label>
            <div className="flex items-center gap-3">
              <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--d-subtle-bg)] border-2 border-dashed border-[var(--d-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {place.avatar_url ? (
                  <img src={place.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{place.section === "workspace" ? "💼" : place.section === "food" ? "🍽️" : "🏪"}</span>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="text-center py-2.5 rounded-xl border-[1.5px] border-[var(--d-border)] text-[12px] font-bold text-[var(--d-green)] bg-[var(--d-green-bg)] hover:bg-[var(--d-green-bg-hover)] transition-colors">
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
                      const compressed = await compressImageForUpload(file);
                      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
                      const fd = new FormData();
                      fd.append("file", compressed);
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
          {place.section === "store" && (
            <div>
              <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">
                نوع المتجر <span className="text-[#E05C35] text-[11px]">*</span>
              </label>
              <select
                value={editStoreType}
                onChange={(e) => setEditStoreType(e.target.value)}
                className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]"
              >
                <option value="">اختر نوع المتجر...</option>
                {STORE_CATEGORIES.map((cat) => (
                  <optgroup key={cat.label} label={`${cat.icon} ${cat.label}`}>
                    {cat.types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">المنطقة</label>
            <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]">
              <option value="">اختر المنطقة...</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>
          </div>
          <FormField label="العنوان التفصيلي" value={editAddress} onChange={setEditAddress} textarea />
          <FormField label="رقم الهاتف" value={editPhone} onChange={setEditPhone} type="tel" />
          <FormField label="واتساب" value={editWhatsapp} onChange={setEditWhatsapp} type="tel" />
          <button
            onClick={handleSaveEdit}
            disabled={saving || (place.section === "store" && !STORE_TYPE_VALUES.includes(editStoreType))}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
          >
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </SheetWrap>

      {/* Add Item Sheet */}
      <SheetWrap open={sheet === "addItem"} onClose={() => setSheet("menu")} title="إضافة صنف جديد" sub="أضف صنف لقائمتك">
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">القسم</label>
            <select value={addItemSection} onChange={(e) => setAddItemSection(e.target.value)} className="w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm text-[var(--d-text)] outline-none appearance-none focus:border-[var(--d-green)]">
              {place.menu.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <FormField label="اسم الصنف" value={addItemName} onChange={setAddItemName} placeholder={itemNamePlaceholder} />
          <FormField label="السعر (₪)" value={addItemPrice} onChange={setAddItemPrice} type="number" placeholder="0" />
          <FormField label="وصف (اختياري)" value={addItemDesc} onChange={setAddItemDesc} placeholder="وصف قصير..." />
          {/* Photo upload */}
          <div>
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">صورة المنتج (اختياري)</label>
            {addItemPhoto ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--d-border)]">
                <img
                  src={addItemPhotoPreview || normalizeImageUrl(addItemPhoto)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => showToast("تعذر عرض الصورة. جرّب صورة أخرى")}
                />
                <button onClick={() => { setAddItemPhoto(""); setAddItemPhotoPreview(""); }} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-[var(--d-border)] rounded-xl py-4 cursor-pointer hover:border-[var(--d-green)] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAddItemPhotoPreview(URL.createObjectURL(file));
                  const url = await uploadProductPhoto(file);
                  if (url) setAddItemPhoto(url);
                  else setAddItemPhotoPreview("");
                  e.target.value = "";
                }} />
                {uploadingPhoto ? (
                  <span className="text-xs text-[var(--d-text-muted)]">جاري الرفع...</span>
                ) : (
                  <span className="text-xs text-[var(--d-text-muted)]">اضغط لرفع صورة</span>
                )}
              </label>
            )}
          </div>
          <button
            onClick={handleAddItem}
            disabled={saving || !addItemName.trim() || uploadingPhoto}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
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
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
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
            <label className="text-xs font-bold text-[var(--d-text-sec)] mb-1.5 block">صورة المنتج</label>
            {editItemPhoto ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--d-border)]">
                <img
                  src={editItemPhotoPreview || normalizeImageUrl(editItemPhoto)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => showToast("تعذر عرض الصورة. جرّب صورة أخرى")}
                />
                <button onClick={() => { setEditItemPhoto(""); setEditItemPhotoPreview(""); }} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-[var(--d-border)] rounded-xl py-4 cursor-pointer hover:border-[var(--d-green)] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setEditItemPhotoPreview(URL.createObjectURL(file));
                  const url = await uploadProductPhoto(file);
                  if (url) setEditItemPhoto(url);
                  else setEditItemPhotoPreview("");
                  e.target.value = "";
                }} />
                {uploadingPhoto ? (
                  <span className="text-xs text-[var(--d-text-muted)]">جاري الرفع...</span>
                ) : (
                  <span className="text-xs text-[var(--d-text-muted)]">اضغط لرفع صورة</span>
                )}
              </label>
            )}
          </div>
          <button
            onClick={handleUpdateItem}
            disabled={saving || !editItemName.trim() || uploadingPhoto}
            className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2"
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
              <div key={p.key} className={`bg-[var(--d-card)] rounded-2xl border-2 p-4 transition-all relative ${
                isSelected ? "border-[var(--d-green)] shadow-lg shadow-[var(--d-green)]/10" : p.featured ? "border-[var(--d-green)] shadow-md shadow-[var(--d-green)]/10" : "border-[var(--d-border)]"
              }`}>
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--d-green)] text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">الأكثر اختياراً</div>
                )}
                <div className="text-[11px] font-bold text-[var(--d-text-sec)] uppercase tracking-wide mb-1">{p.badge}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-black text-[var(--d-text)] leading-none">{p.price}</span>
                  <span className="text-[14px] font-bold text-[var(--d-text-sec)]">₪</span>
                  {p.price !== "0" && <span className="text-[11px] text-[var(--d-text-muted)]">/ شهر</span>}
                </div>
                <div className="h-px bg-[var(--d-toggle-off)] my-3" />
                <div className="space-y-2 mb-3">
                  {FEATURES.map((f) => {
                    const has = f[p.key as keyof typeof f] as boolean;
                    return (
                      <div key={f.name} className={`flex items-start gap-2 text-[11px] ${has ? "text-[var(--d-text-sec)]" : "text-[var(--d-text-muted)]"}`}>
                        {has ? (
                          <span className="text-[var(--d-green)] font-bold text-xs mt-px flex-shrink-0">✓</span>
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
                      ? "border-2 border-[var(--d-green)]/40 text-[var(--d-green)] bg-[var(--d-green-bg)]"
                      : isSelected
                        ? "bg-[var(--d-green)] text-white"
                        : p.featured
                          ? "bg-[var(--d-green)] text-white shadow-md shadow-[var(--d-green)]/25"
                          : "bg-[var(--d-subtle-bg)] text-[var(--d-text-sec)] border border-[var(--d-border)]"
                  }`}
                >
                  {isCurrent ? "باقتك الحالية ✓" : isSelected ? "تم الاختيار ✓" : `اشترك في ${p.badge}`}
                </button>

                {/* Payment inside card */}
                {isPaid && isSelected && !isCurrent && (
                  <div className="mt-3 pt-3 border-t border-[var(--d-green)]/40 text-right">
                    <div className="bg-[var(--d-subtle-bg)] rounded-xl p-3 mb-2">
                      <div className="text-[10px] text-[var(--d-text-muted)] font-semibold mb-1.5">١. حوّل المبلغ عبر بنك فلسطين</div>
                      <div className="bg-[var(--d-card)] border border-[var(--d-border)] rounded-xl px-3 py-2.5 flex items-center justify-between">
                        <span className="text-[15px] font-bold text-[var(--d-text)] tracking-wider" dir="ltr">0567359920</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("0567359920"); }}
                          className="text-[10px] text-[var(--d-green)] font-bold bg-[var(--d-green-bg)] rounded-lg px-2.5 py-1"
                        >
                          نسخ
                        </button>
                      </div>
                    </div>
                    <div className="bg-[var(--d-subtle-bg)] rounded-xl p-3">
                      <div className="text-[10px] text-[var(--d-text-muted)] font-semibold mb-1.5">٢. أرسل إشعار التحويل للتأكيد</div>
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
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--d-green)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="space-y-3.5">
          <div className="text-[11px] font-bold text-[var(--d-text-sec)] mb-1">الأسعار (بالشيكل)</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="سعر الساعة" value={wsDetails.price_hour} onChange={(v) => setWsDetails(d => ({...d, price_hour: v}))} type="number" placeholder="0" />
            <FormField label="نصف يوم" value={wsDetails.price_half_day} onChange={(v) => setWsDetails(d => ({...d, price_half_day: v}))} type="number" placeholder="0" />
            <FormField label="يوم كامل" value={wsDetails.price_day} onChange={(v) => setWsDetails(d => ({...d, price_day: v}))} type="number" placeholder="0" />
            <FormField label="أسبوع" value={wsDetails.price_week} onChange={(v) => setWsDetails(d => ({...d, price_week: v}))} type="number" placeholder="0" />
          </div>
          <FormField label="سعر الشهر" value={wsDetails.price_month} onChange={(v) => setWsDetails(d => ({...d, price_month: v}))} type="number" placeholder="0" />

          <div className="h-px bg-[var(--d-toggle-off)] my-1" />
          <div className="text-[11px] font-bold text-[var(--d-text-sec)] mb-1">أوقات العمل</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="يفتح الساعة" value={wsDetails.opens_at} onChange={(v) => setWsDetails(d => ({...d, opens_at: v}))} type="time" />
            <FormField label="يغلق الساعة" value={wsDetails.closes_at} onChange={(v) => setWsDetails(d => ({...d, closes_at: v}))} type="time" />
          </div>

          <div className="h-px bg-[var(--d-toggle-off)] my-1" />
          <div className="text-[11px] font-bold text-[var(--d-text-sec)] mb-1">المقاعد</div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="إجمالي المقاعد" value={wsDetails.total_seats} onChange={(v) => setWsDetails(d => ({...d, total_seats: v}))} type="number" placeholder="0" />
            <FormField label="المقاعد المتاحة" value={wsDetails.available_seats} onChange={(v) => setWsDetails(d => ({...d, available_seats: v}))} type="number" placeholder="0" />
          </div>

          <button onClick={handleSaveWsDetails} disabled={saving} className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2">
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
        )}
      </SheetWrap>

      {/* Workspace Services Sheet */}
      <SheetWrap open={sheet === "wsServices"} onClose={() => setSheet(null)} title="الخدمات المتاحة" sub="فعّل الخدمات المتوفرة في مساحتك">
        {wsLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--d-green)] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="space-y-3">
          {wsServices.map((s, i) => (
            <div key={s.service} className={`bg-[var(--d-card)] border rounded-2xl p-4 transition-all ${s.available ? 'border-[var(--d-green)]/30 bg-[var(--d-card-hover)]' : 'border-[var(--d-border)]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[13px] text-[var(--d-text)]">{WS_SERVICE_LABELS[s.service] || s.service}</span>
                <button
                  onClick={() => setWsServices(prev => prev.map((ss, j) => j === i ? {...ss, available: !ss.available} : ss))}
                  className={`w-12 h-[26px] rounded-full relative transition-colors flex-shrink-0 ${s.available ? "bg-[var(--d-green)]" : "bg-[var(--d-toggle-off)]"}`}
                >
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${s.available ? "right-[25px]" : "right-[3px]"}`} />
                </button>
              </div>
              {s.available && (
                <input
                  value={s.detail}
                  onChange={(e) => setWsServices(prev => prev.map((ss, j) => j === i ? {...ss, detail: e.target.value} : ss))}
                  placeholder="تفاصيل إضافية (اختياري)..."
                  className="w-full border border-[var(--d-border)] rounded-xl px-3 py-2 text-[12px] text-[var(--d-text)] bg-[var(--d-input-bg)] outline-none focus:border-[var(--d-green)] placeholder:text-[var(--d-text-muted)]"
                />
              )}
            </div>
          ))}
          <button onClick={handleSaveWsServices} disabled={saving} className="w-full bg-[var(--d-green)] text-white font-bold text-[15px] rounded-[14px] py-3.5 shadow-lg shadow-[var(--d-green)]/25 disabled:opacity-50 mt-2">
            {saving ? "جاري الحفظ..." : "حفظ الخدمات"}
          </button>
        </div>
        )}
      </SheetWrap>

      {/* Footer */}
      <div className="text-center pb-20 lg:pb-8 px-4 max-w-[1100px] mx-auto">
        <p className="text-[10px] lg:text-xs text-[var(--d-text-muted)]">غزة بريس 🌿 لوحة تحكم المالك</p>
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
          <div className="relative bg-[var(--d-card)] border border-[var(--d-border)] rounded-2xl p-5 w-full max-w-[280px] shadow-xl text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--d-red-bg)] flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#E05C35" strokeWidth={2} strokeLinecap="round">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              </svg>
            </div>
            <p className="text-[13px] font-bold text-[var(--d-text)] mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold border border-[var(--d-border)] text-[var(--d-text-muted)] bg-[var(--d-subtle-bg)]"
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

function ActionItem({ icon, iconBg, iconColor, title, sub, badge, onClick, last, active }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  title: string; sub: string; badge?: React.ReactNode;
  onClick?: () => void; last?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 lg:gap-4 px-4 py-3.5 lg:py-4 text-right transition-colors hover:bg-[var(--d-card-hover)] active:bg-[var(--d-card-hover)] ${active ? "bg-[var(--d-card-hover)]" : ""} ${last ? "" : "border-b border-[var(--d-border)]"}`}>
      <div className={`w-[42px] h-[42px] lg:w-[48px] lg:h-[48px] rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <svg viewBox="0 0 24 24" className={`w-5 h-5 lg:w-6 lg:h-6 ${iconColor}`} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {(icon as React.ReactElement<{ children?: React.ReactNode }>).props.children}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13px] lg:text-sm text-[var(--d-text)]">{title}</div>
        <div className="text-[11px] lg:text-xs text-[var(--d-text-muted)]">{sub}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {badge}
        <span className="text-[var(--d-text-muted)] text-sm">‹</span>
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
      {active && <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-10 h-7 bg-[var(--d-green-bg)] rounded-[9px] z-0" />}
      <svg viewBox="0 0 24 24" className={`w-[18px] h-[18px] relative z-[1] ${active ? "stroke-[var(--d-green)]" : "stroke-[var(--d-text-muted)]"}`} fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {icons[icon]}
      </svg>
      <span className={`text-[9px] font-bold relative z-[1] ${active ? "text-[var(--d-green)]" : "text-[var(--d-text-muted)]"}`}>{label}</span>
    </button>
  );
}

function SheetWrap({ open, onClose, title, sub, children }: {
  open: boolean; onClose: () => void; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop for desktop */}
      {open && <div className="hidden lg:block fixed inset-0 bg-black/20 z-[19]" onClick={onClose} />}
      <div className={`fixed inset-0 bg-[var(--d-page)] z-20 flex flex-col transition-transform duration-300 lg:inset-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-[520px] lg:max-w-[90vw] lg:shadow-2xl lg:transition-transform ${open ? "translate-y-0 lg:translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"} ${open ? "" : "pointer-events-none"}`} dir="rtl">
        <div className="bg-[var(--d-green)] px-4 pt-4 pb-5 flex-shrink-0 relative overflow-hidden lg:px-6 lg:pt-6 lg:pb-6">
          <div className="absolute w-[130px] h-[130px] rounded-full bg-white/5 -bottom-10 -left-4" />
          <div className="flex items-center gap-2 mb-1 relative z-[1]">
            <button onClick={onClose} className="w-[30px] h-[30px] lg:w-[36px] lg:h-[36px] bg-white/10 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="font-bold text-sm lg:text-base text-white">{title}</span>
          </div>
          <div className="text-[11px] lg:text-xs text-white/50 pr-[38px] lg:pr-[44px]">{sub}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 lg:px-6 lg:pb-8">
          {children}
        </div>
      </div>
    </>

  );
}

function FormField({ label, value, onChange, type = "text", placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full border-[1.5px] border-[var(--d-border)] bg-[var(--d-subtle-bg)] rounded-xl px-3.5 py-3 text-sm lg:text-base text-[var(--d-text)] outline-none transition-colors placeholder:text-[var(--d-text-muted)] focus:border-[var(--d-green)]";
  return (
    <div>
      <label className="text-xs font-bold text-[var(--d-text-muted)] mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${cls} resize-none h-[72px]`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
