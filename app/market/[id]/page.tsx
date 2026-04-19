"use client";

import { use, useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useListing, useAreas } from "@/lib/queries/hooks";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/fetch";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { useSession } from "@/hooks/useSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useMarketSidebar } from "@/app/market/layout";

const CONDITION_LABEL: Record<string, { label: string; cls: string }> = {
  new:    { label: "جديد",    cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  used:   { label: "مستعمل", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  urgent: { label: "عاجل",   cls: "bg-red-50 text-red-700 border-red-200" },
};

const CATEGORY_LABEL: Record<string, string> = {
  electronics: "إلكترونيات",
  clothes:     "ملابس",
  furniture:   "أثاث",
  food:        "طعام",
  books:       "كتب",
  tools:       "أدوات",
  toys:        "ألعاب",
  other:       "أخرى",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: listing, isLoading, isError } = useListing(id);
  const [imgIndex, setImgIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const [chatLoading, setChatLoading] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [phoneAuthReason, setPhoneAuthReason] = useState<"chat" | "save">("chat");
  const [showShare, setShowShare] = useState(false);
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [markingSold, setMarkingSold] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { contributor } = useSession();
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];

  // Edit sheet
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCondition, setEditCondition] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [editNegotiable, setEditNegotiable] = useState(false);
  const [editImages, setEditImages] = useState<Array<{ kind: "existing"; url: string } | { kind: "new"; file: File; preview: string }>>([]);
  const [editSaving, setEditSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync saved state when listing data loads / changes
  useEffect(() => {
    if (listing) setSaved(listing.is_saved ?? false);
  }, [listing?.is_saved]);

  // Desktop
  const isDesktop = useIsDesktop();

  // Inject listing context into the global sidebar slot
  const cond_for_sidebar = listing ? (CONDITION_LABEL[listing.condition] ?? CONDITION_LABEL.used) : null;
  useMarketSidebar(
    isDesktop && listing ? (
      <div className="space-y-4">
        <Link href="/market" className="flex items-center gap-1.5 text-xs text-mist hover:text-olive transition-colors font-semibold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          العودة للسوق
        </Link>
        <div className="h-px bg-border" />
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-bold text-mist uppercase tracking-widest mb-1.5">التصنيف</div>
            <span className="text-sm font-semibold text-ink">{CATEGORY_LABEL[listing.category]}</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-mist uppercase tracking-widest mb-1.5">الحالة</div>
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", cond_for_sidebar!.cls)}>{cond_for_sidebar!.label}</span>
          </div>
          {listing.area && (
            <div>
              <div className="text-[10px] font-bold text-mist uppercase tracking-widest mb-1.5">المنطقة</div>
              <span className="text-sm font-semibold text-ink">{listing.area.name_ar}</span>
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold text-mist uppercase tracking-widest mb-1.5">تاريخ النشر</div>
            <span className="text-xs text-mist">{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </div>
    ) : null
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleChatClick() {
    if (!contributor?.phone_verified) {
      setPhoneAuthReason("chat");
      setShowPhoneAuth(true);
      return;
    }
    await startChat();
  }

  async function startChat() {
    setChatLoading(true);
    try {
      const res = await apiFetch("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ listing_id: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.message || "تعذر بدء المحادثة");
        return;
      }
      const conv = await res.json();
      router.push(`/market/chat/${conv.id}`);
    } catch {
      showToast("تعذر الاتصال — تحقق من الإنترنت");
    } finally {
      setChatLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-fog">
        <div className="flex items-center gap-3 bg-surface border-b border-border px-4 py-3">
          <button onClick={() => router.back()} className="text-mist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="h-4 w-32 bg-fog rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoaderDots />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="flex flex-col min-h-dvh bg-fog items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">😕</div>
        <div className="font-display font-bold text-ink">الإعلان غير موجود</div>
        <Link href="/market" className="text-olive text-sm font-semibold">← العودة للسوق</Link>
      </div>
    );
  }

  const sortedImages = [...(listing.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const cond = CONDITION_LABEL[listing.condition] ?? CONDITION_LABEL.used;
  const isMine = listing.seller_id === contributor?.id;
  const currentStatus = listingStatus ?? listing.status;

  async function handleMarkSold() {
    if (markingSold) return;
    setMarkingSold(true);
    try {
      const res = await apiFetch(`/api/listings/${id}/sold`, { method: "PATCH" });
      if (res.ok) setListingStatus("sold");
      else showToast("تعذر تحديث الإعلان");
    } catch {
      showToast("تعذر الاتصال");
    } finally {
      setMarkingSold(false);
    }
  }

  async function handleSave() {
    if (!contributor?.phone_verified) {
      setPhoneAuthReason("save");
      setShowPhoneAuth(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = await apiFetch(`/api/listings/${id}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
        queryClient.invalidateQueries({ queryKey: ["savedIds"] });
        queryClient.invalidateQueries({ queryKey: ["listings"] });
      } else {
        setSaved(!next);
      }
    } catch {
      setSaved(!next);
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    if (!listing) return;
    const sorted = [...(listing.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    setEditTitle(listing.title);
    setEditPrice(String(listing.price));
    setEditDesc(listing.description ?? "");
    setEditCategory(listing.category);
    setEditCondition(listing.condition);
    setEditAreaId(listing.area?.id ?? "");
    setEditNegotiable(listing.is_negotiable);
    setEditImages(sorted.map((img) => ({ kind: "existing" as const, url: img.url })));
    setShowEdit(true);
  }

  function handleEditImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 4 - (editImages as []).length;
    setEditImages((prev: any[]) => [
      ...prev,
      ...files.slice(0, remaining).map((f) => ({ kind: "new" as const, file: f, preview: URL.createObjectURL(f) })),
    ]);
    e.target.value = "";
  }

  function removeEditImage(idx: number) {
    setEditImages((prev: any[]) => {
      const e = prev[idx];
      if (e.kind === "new") URL.revokeObjectURL(e.preview);
      return prev.filter((_: unknown, i: number) => i !== idx);
    });
  }

  async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch("/api/upload/listing", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d?.message ?? "فشل رفع الصورة");
    return d.url as string;
  }

  async function handleEditSave() {
    setEditSaving(true);
    try {
      const image_urls = await Promise.all(
        (editImages as any[]).map((e: any) => e.kind === "existing" ? e.url : uploadImage(e.file))
      );
      const res = await apiFetch(`/api/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          price: parseFloat(editPrice),
          description: editDesc.trim() || null,
          category: editCategory,
          condition: editCondition,
          area_id: editAreaId || null,
          is_negotiable: editNegotiable,
          image_urls,
        }),
      });
      if (!res.ok) { alert("تعذر حفظ التعديلات"); return; }
      setShowEdit(false);
      window.location.reload();
    } catch {
      alert("تعذر الاتصال");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.replace("/market");
      } else {
        alert("تعذر حذف الإعلان");
      }
    } catch {
      alert("تعذر الاتصال");
    } finally {
      setDeleting(false);
    }
  }

  function handleShare() {
    if (navigator.share) {
      const text = `${listing!.title} — ₪${Number(listing!.price).toLocaleString()}\n${window.location.href}`;
      navigator.share({ title: listing!.title, text, url: window.location.href }).catch(() => {});
    } else {
      setShowShare(true);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShowShare(false);
    }).catch(() => {});
  }

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-full overflow-y-auto bg-fog">
        <div className="max-w-2xl mx-auto p-6">

          {/* Status banners */}
          {currentStatus === "pending" && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><circle cx="12" cy="16" r="0.5" fill="#D97706"/></svg>
              <div>
                <p className="text-xs font-bold text-amber-800">قيد المراجعة</p>
                <p className="text-[10px] text-amber-600">إعلانك قيد مراجعة الإدارة وسيظهر للعامة بعد الموافقة</p>
              </div>
            </div>
          )}
          {currentStatus === "sold" && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs font-bold text-slate-500">تم البيع — هذا الإعلان لم يعد متاحاً</p>
            </div>
          )}

          {/* Main card */}
          <div className="bg-surface rounded-2xl border border-border/60 shadow-sm overflow-hidden">

            {/* Image */}
            <div className="relative w-full bg-fog" style={{ height: 340 }}>
              {sortedImages.length > 0 ? (
                <Image
                  src={sortedImages[imgIndex].url}
                  alt={listing.title}
                  fill
                  className="object-cover cursor-zoom-in"
                  sizes="672px"
                  onClick={() => setLightbox(true)}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl bg-olive-pale">📦</div>
              )}
              {sortedImages.length > 1 && imgIndex > 0 && (
                <button onClick={() => setImgIndex(i => i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
                </button>
              )}
              {sortedImages.length > 1 && imgIndex < sortedImages.length - 1 && (
                <button onClick={() => setImgIndex(i => i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>

            {/* Thumbnails */}
            {sortedImages.length > 1 && (
              <div className="flex gap-2 px-5 py-3 border-b border-border overflow-x-auto no-scrollbar">
                {sortedImages.map((img, i) => (
                  <button key={i} onClick={() => setImgIndex(i)} className={cn("w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors", i === imgIndex ? "border-olive" : "border-transparent opacity-50 hover:opacity-80")}>
                    <Image src={img.url} alt="" width={56} height={56} className="w-full h-full object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="p-5">

              {/* Title + price row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="font-display font-black text-xl text-ink leading-snug mb-2">{listing.title}</h1>
                  <div className="flex items-baseline gap-1.5" dir="ltr">
                    <span className="font-display font-black text-3xl text-olive-deep">{Number(listing.price).toLocaleString()}</span>
                    <span className="text-sm text-mist font-body">₪</span>
                  </div>
                  {listing.is_negotiable && (
                    <span className="inline-block mt-1.5 text-[11px] font-semibold text-mist bg-fog border border-border px-2.5 py-0.5 rounded-full">قابل للتفاوض</span>
                  )}
                </div>
                {/* Quick save button */}
                <button onClick={handleSave}
                  className={cn("w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors",
                    saved ? "bg-olive-pale border-olive-mid text-olive" : "bg-fog border-border text-mist hover:text-ink")}>
                  <svg viewBox="0 0 24 24" className={cn("w-4.5 h-4.5", saved ? "fill-olive stroke-olive" : "fill-none stroke-current")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                  </svg>
                </button>
              </div>

              <div className="h-px bg-border mb-4" />

              {/* Seller */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-olive flex items-center justify-center flex-shrink-0">
                  {listing.seller.display_handle ? (
                    <span className="text-white font-black text-sm">{listing.seller.display_handle.slice(0, 1).toUpperCase()}</span>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{listing.seller.display_handle ?? "بائع"}</div>
                  <div className="text-[11px] text-mist">بائع في السوق المحلي</div>
                </div>
                {isMine && <span className="text-[10px] font-bold text-olive bg-olive-pale px-2.5 py-1 rounded-full border border-olive-mid">إعلانك</span>}
              </div>

              {/* Description */}
              {listing.description && (
                <>
                  <div className="h-px bg-border mb-4" />
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
                </>
              )}

              <div className="h-px bg-border my-4" />

              {/* Action buttons */}
              {isMine ? (
                <div className="flex gap-2">
                  <button onClick={openEdit}
                    className="flex-1 flex items-center justify-center gap-2 bg-olive text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                    تعديل الإعلان
                  </button>
                  {currentStatus === "active" && (
                    <button onClick={handleMarkSold} disabled={markingSold}
                      className="flex items-center gap-2 bg-slate-100 text-slate-600 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 disabled:opacity-60">
                      {markingSold ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" /> : "✓ تم البيع"}
                    </button>
                  )}
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 bg-red-50 text-red-600 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-red-100 border border-red-100">
                    حذف
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {currentStatus === "active" && (
                    <button onClick={handleChatClick} disabled={chatLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-olive text-white text-sm font-bold py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60">
                      {chatLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>راسل البائع</>
                      )}
                    </button>
                  )}
                  <button onClick={handleShare}
                    className="flex items-center justify-center gap-2 bg-fog text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl border border-border hover:bg-border/60 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeLinecap="round"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeLinecap="round"/></svg>
                    مشاركة
                  </button>
                </div>
              )}

            </div>
          </div>

              {/* Edit bottom sheet */}
              {showEdit && (
                <>
                  <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !editSaving && setShowEdit(false)} />
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-2xl max-h-[90dvh] flex flex-col">
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                      <h2 className="font-display font-bold text-[16px] text-ink">تعديل الإعلان</h2>
                      <button onClick={() => setShowEdit(false)} className="text-mist text-2xl leading-none">×</button>
                    </div>
                    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                      <div>
                        <label className="block text-xs text-mist mb-1">العنوان</label>
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-mist mb-1">السعر (₪)</label>
                          <input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive" />
                        </div>
                        <div>
                          <label className="block text-xs text-mist mb-1">التصنيف</label>
                          <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive">
                            {[["electronics","إلكترونيات"],["clothes","ملابس"],["furniture","أثاث"],["food","طعام"],["books","كتب"],["tools","أدوات"],["toys","ألعاب"],["other","أخرى"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-mist mb-1">الحالة</label>
                          <select value={editCondition} onChange={(e) => setEditCondition(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive">
                            <option value="new">جديد</option>
                            <option value="used">مستعمل</option>
                            <option value="urgent">عاجل</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-mist mb-1">المنطقة</label>
                          <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive">
                            <option value="">—</option>
                            {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-mist mb-1">الوصف</label>
                        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive resize-none" />
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editNegotiable} onChange={(e) => setEditNegotiable(e.target.checked)} className="rounded" />
                        <span className="text-sm text-ink">قابل للتفاوض</span>
                      </label>
                      <div>
                        <label className="block text-xs text-mist mb-2">الصور ({(editImages as []).length}/4)</label>
                        <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleEditImagePick} />
                        <div className="flex flex-wrap gap-2">
                          {(editImages as any[]).map((entry: any, idx: number) => {
                            const src = entry.kind === "existing" ? entry.url : entry.preview;
                            return (
                              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border flex-shrink-0">
                                <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                                <button type="button" onClick={() => removeEditImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            );
                          })}
                          {(editImages as []).length < 4 && (
                            <button type="button" onClick={() => editFileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-border text-mist hover:border-olive hover:text-olive transition-colors flex flex-col items-center justify-center gap-1">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                              <span className="text-[10px]">إضافة</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-6 pt-4 border-t border-border flex-shrink-0">
                      <button onClick={handleEditSave} disabled={editSaving || !editTitle.trim() || !editPrice} className="w-full bg-olive text-white font-bold py-3 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                        {editSaving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                        حفظ التعديلات
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Delete confirm */}
              {showDeleteConfirm && (
                <>
                  <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !deleting && setShowDeleteConfirm(false)} />
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-2xl px-5 pt-6 pb-8">
                    <h2 className="font-display font-bold text-[16px] text-ink mb-1 text-center">حذف الإعلان؟</h2>
                    <p className="text-sm text-mist text-center mb-6">لن يظهر الإعلان بعد الحذف</p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="flex-1 py-3 rounded-2xl border border-border text-ink font-semibold text-sm">إلغاء</button>
                      <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2">
                        {deleting && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                        حذف
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Lightbox */}
              {lightbox && sortedImages.length > 0 && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setLightbox(false)}>
                  <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center" onClick={() => setLightbox(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <div className="relative w-full h-full">
                    <Image src={sortedImages[imgIndex].url} alt={listing.title} fill className="object-contain" sizes="100vw" />
                  </div>
                  {sortedImages.length > 1 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                      {sortedImages.map((_, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                          className={cn("h-1.5 rounded-full transition-all", i === imgIndex ? "bg-white w-4" : "bg-white/40 w-1.5")} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Share sheet */}
              {showShare && (() => {
                const url = window.location.href;
                const text = `${listing!.title} — ₪${Number(listing!.price).toLocaleString()}`;
                const encoded = encodeURIComponent(`${text}\n${url}`);
                const encodedUrl = encodeURIComponent(url);
                const encodedText = encodeURIComponent(text);
                const options = [
                  {
                    label: "نسخ الرابط",
                    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round"/></svg>),
                    bg: "bg-slate-100", color: "text-slate-700",
                    action: copyLink,
                  },
                  {
                    label: "واتساب",
                    icon: (<svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>),
                    bg: "bg-[#E8FBF0]", color: "text-[#1A6B3A]",
                    action: () => { window.open(`https://wa.me/?text=${encoded}`, "_blank"); setShowShare(false); },
                  },
                  {
                    label: "تيليغرام",
                    icon: (<svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2AABEE"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.56l-2.982-.924c-.648-.204-.66-.648.136-.961l11.647-4.492c.537-.194 1.006.131.833.958z"/></svg>),
                    bg: "bg-[#E8F5FE]", color: "text-[#1a86c7]",
                    action: () => { window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank"); setShowShare(false); },
                  },
                  {
                    label: "فيسبوك",
                    icon: (<svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>),
                    bg: "bg-[#E7F0FD]", color: "text-[#1877F2]",
                    action: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank"); setShowShare(false); },
                  },
                  {
                    label: "SMS",
                    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>),
                    bg: "bg-green-50", color: "text-green-700",
                    action: () => { window.open(`sms:?body=${encoded}`); setShowShare(false); },
                  },
                ];
                return (
                  <>
                    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowShare(false)} />
                    <div className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-2xl p-4 pb-10">
                      <div className="w-9 h-1 bg-border rounded-full mx-auto mb-4" />
                      <p className="font-display font-bold text-ink text-center mb-5">مشاركة الإعلان</p>
                      <div className="flex justify-between gap-1">
                        {options.map((opt) => (
                          <button key={opt.label} onClick={opt.action} className="flex flex-col items-center gap-1.5 flex-1 active:scale-95 transition-transform">
                            <div className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center ${opt.color}`}>{opt.icon}</div>
                            <span className="text-[9px] font-semibold text-mist text-center leading-tight">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Phone auth popup */}
              <PhoneAuthPopup
                open={showPhoneAuth}
                onClose={() => setShowPhoneAuth(false)}
                reason={phoneAuthReason === "save" ? "لحفظ هذا الإعلان يجب تسجيل الدخول أولاً" : "لمراسلة البائع يجب تسجيل الدخول أولاً"}
                onVerified={async () => {
                  setShowPhoneAuth(false);
                  if (phoneAuthReason === "chat") await startChat();
                  else { setSaved(true); queryClient.invalidateQueries({ queryKey: ["savedIds"] }); queryClient.invalidateQueries({ queryKey: ["listings"] }); }
                }}
              />

              {toast && (
                <div className="fixed top-4 left-4 right-4 z-[60] flex justify-center pointer-events-none">
                  <div className="bg-ink/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg pointer-events-auto">
                    {toast}
                  </div>
                </div>
              )}

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-fog">
      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── Hero image ── */}
        <div className="relative w-full bg-fog" style={{ height: 270 }}>
          {sortedImages.length > 0 ? (
            <Image
              src={sortedImages[imgIndex].url}
              alt={listing.title}
              fill
              className="object-cover cursor-zoom-in"
              sizes="100vw"
              priority
              onClick={() => setLightbox(true)}
            />
          ) : (
            <div className="w-full h-full bg-olive-pale flex items-center justify-center text-7xl">📦</div>
          )}

          {/* Back — top right */}
          <button
            onClick={() => router.back()}
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-[10px] bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Save + Share — top left */}
          <div className="absolute top-3.5 left-3.5 flex gap-1.5">
            <button
              onClick={handleSave}
              className="w-9 h-9 rounded-[10px] bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className={cn("w-4 h-4 transition-colors", saved ? "fill-white stroke-white" : "fill-none stroke-white")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-[10px] bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeLinecap="round"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Image count */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/45 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
              {imgIndex + 1} / {sortedImages.length}
            </div>
          )}

          {/* Carousel dots + arrows */}
          {sortedImages.length > 1 && (
            <>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {sortedImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={cn("h-1.5 rounded-full transition-all", i === imgIndex ? "bg-white w-[18px]" : "bg-white/40 w-1.5")}
                  />
                ))}
              </div>
              {imgIndex > 0 && (
                <button onClick={() => setImgIndex(i => i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
                </button>
              )}
              {imgIndex < sortedImages.length - 1 && (
                <button onClick={() => setImgIndex(i => i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Status banner (pending / sold) ── */}
        {currentStatus === "pending" && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><circle cx="12" cy="16" r="0.5" fill="#D97706"/>
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-800">قيد المراجعة</p>
              <p className="text-[10px] text-amber-600">إعلانك قيد مراجعة الإدارة وسيظهر للعامة بعد الموافقة</p>
            </div>
          </div>
        )}
        {currentStatus === "sold" && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-xs font-bold text-slate-600">تم البيع</p>
              <p className="text-[10px] text-slate-500">هذا الإعلان لم يعد متاحاً</p>
            </div>
          </div>
        )}

        {/* ── Main info card ── */}
        <div className="mx-4 mt-3 bg-surface rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="font-display font-black text-[18px] text-ink leading-snug flex-1">{listing.title}</h1>
            <div className="flex-shrink-0 text-left" dir="ltr">
              <span className="font-display font-black text-[26px] text-olive-deep leading-none">
                {Number(listing.price).toLocaleString()}
              </span>
              <span className="text-sm text-mist font-normal"> ₪</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full border", cond.cls)}>
              {cond.label}
            </span>
            {listing.is_negotiable && (
              <span className="text-[10px] font-semibold text-mist bg-fog border border-border px-2.5 py-1 rounded-full">
                قابل للتفاوض
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="bg-fog border border-border px-2.5 py-1 rounded-full text-ink font-semibold">
              {CATEGORY_LABEL[listing.category] ?? listing.category}
            </span>
            {listing.area && (
              <span className="flex items-center gap-1 text-mist">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {listing.area.name_ar}
              </span>
            )}
            <span className="flex items-center gap-1 text-mist">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeAgo(listing.created_at)}
            </span>
          </div>
        </div>

        {/* ── Seller card ── */}
        <div className="mx-4 mt-3 bg-surface rounded-2xl border border-border p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-olive flex items-center justify-center flex-shrink-0">
            {listing.seller.display_handle ? (
              <span className="text-white font-black text-base">
                {listing.seller.display_handle.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ink truncate">
              {listing.seller.display_handle ?? "بائع"}
            </div>
            <div className="text-[11px] text-mist">بائع في السوق المحلي</div>
          </div>
          {isMine && (
            <span className="text-[10px] font-bold text-olive bg-olive-pale px-2.5 py-1 rounded-full flex-shrink-0">
              إعلانك
            </span>
          )}
        </div>

        {/* ── Description ── */}
        {listing.description && (
          <div className="mx-4 mt-3 bg-surface rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-[3px] h-4 bg-olive rounded-full" />
              <span className="font-display font-bold text-[13px] text-ink">الوصف</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* ── Details grid ── */}
        <div className="mx-4 mt-3 mb-2 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-surface p-3.5">
              <div className="text-[10px] text-mist mb-1">التصنيف</div>
              <div className="text-[13px] font-bold text-ink">{CATEGORY_LABEL[listing.category] ?? listing.category}</div>
            </div>
            <div className="bg-surface p-3.5">
              <div className="text-[10px] text-mist mb-1">الحالة</div>
              <div className="text-[13px] font-bold text-ink">{cond.label}</div>
            </div>
            <div className="bg-surface p-3.5">
              <div className="text-[10px] text-mist mb-1">المنطقة</div>
              <div className="text-[13px] font-bold text-ink">{listing.area?.name_ar ?? "—"}</div>
            </div>
            <div className="bg-surface p-3.5">
              <div className="text-[10px] text-mist mb-1">تاريخ النشر</div>
              <div className="text-[13px] font-bold text-ink">{timeAgo(listing.created_at)}</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Floating action button ── */}
      {isMine ? (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] left-4 z-10 flex items-center gap-2">
          {currentStatus === "active" && (
            <button
              onClick={handleMarkSold}
              disabled={markingSold}
              className="flex items-center gap-2 bg-slate-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg active:scale-95 transition-transform disabled:opacity-60"
            >
              {markingSold ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  تم البيع
                </>
              )}
            </button>
          )}
          <button
            onClick={openEdit}
            className="flex items-center gap-2 bg-olive text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            تعديل
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : (
        currentStatus === "active" && (
          <button
            onClick={handleChatClick}
            disabled={chatLoading}
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] left-4 z-10 flex items-center gap-2 bg-olive text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-[0_4px_14px_rgba(30,77,43,0.35)] active:scale-95 transition-transform disabled:opacity-60"
          >
            {chatLoading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                راسل البائع
              </>
            )}
          </button>
        )
      )}

      {/* ── Edit bottom sheet ── */}
      {showEdit && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !editSaving && setShowEdit(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-2xl max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
              <h2 className="font-display font-bold text-[16px] text-ink">تعديل الإعلان</h2>
              <button onClick={() => setShowEdit(false)} className="text-mist text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs text-mist mb-1">العنوان</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mist mb-1">السعر (₪)</label>
                  <input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive" />
                </div>
                <div>
                  <label className="block text-xs text-mist mb-1">التصنيف</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive">
                    {[["electronics","إلكترونيات"],["clothes","ملابس"],["furniture","أثاث"],["food","طعام"],["books","كتب"],["tools","أدوات"],["toys","ألعاب"],["other","أخرى"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mist mb-1">الحالة</label>
                  <select value={editCondition} onChange={(e) => setEditCondition(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive">
                    <option value="new">جديد</option>
                    <option value="used">مستعمل</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-mist mb-1">المنطقة</label>
                  <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive">
                    <option value="">—</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-mist mb-1">الوصف</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink bg-fog outline-none focus:border-olive resize-none" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editNegotiable} onChange={(e) => setEditNegotiable(e.target.checked)} className="rounded" />
                <span className="text-sm text-ink">قابل للتفاوض</span>
              </label>
              {/* Images */}
              <div>
                <label className="block text-xs text-mist mb-2">الصور ({(editImages as []).length}/4)</label>
                <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleEditImagePick} />
                <div className="flex flex-wrap gap-2">
                  {(editImages as any[]).map((entry: any, idx: number) => {
                    const src = entry.kind === "existing" ? entry.url : entry.preview;
                    return (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border flex-shrink-0">
                        <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                        <button type="button" onClick={() => removeEditImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    );
                  })}
                  {(editImages as []).length < 4 && (
                    <button type="button" onClick={() => editFileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-border text-mist hover:border-olive hover:text-olive transition-colors flex flex-col items-center justify-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span className="text-[10px]">إضافة</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 pb-6 pt-4 border-t border-border flex-shrink-0">
              <button onClick={handleEditSave} disabled={editSaving || !editTitle.trim() || !editPrice} className="w-full bg-olive text-white font-bold py-3 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {editSaving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                حفظ التعديلات
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-2xl px-5 pt-6 pb-8">
            <h2 className="font-display font-bold text-[16px] text-ink mb-1 text-center">حذف الإعلان؟</h2>
            <p className="text-sm text-mist text-center mb-6">لن يظهر الإعلان بعد الحذف</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="flex-1 py-3 rounded-2xl border border-border text-ink font-semibold text-sm">إلغاء</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2">
                {deleting && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                حذف
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Lightbox ── */}
      {lightbox && sortedImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setLightbox(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="relative w-full h-full">
            <Image
              src={sortedImages[imgIndex].url}
              alt={listing.title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          {sortedImages.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
              {sortedImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                  className={cn("h-1.5 rounded-full transition-all", i === imgIndex ? "bg-white w-4" : "bg-white/40 w-1.5")}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Share sheet ── */}
      {showShare && (() => {
        const url = window.location.href;
        const text = `${listing!.title} — ₪${Number(listing!.price).toLocaleString()}`;
        const encoded = encodeURIComponent(`${text}\n${url}`);
        const encodedUrl = encodeURIComponent(url);
        const encodedText = encodeURIComponent(text);

        const options = [
          {
            label: "نسخ الرابط",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round"/>
              </svg>
            ),
            bg: "bg-slate-100", color: "text-slate-700",
            action: copyLink,
          },
          {
            label: "واتساب",
            icon: (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            ),
            bg: "bg-[#E8FBF0]", color: "text-[#1A6B3A]",
            action: () => { window.open(`https://wa.me/?text=${encoded}`, "_blank"); setShowShare(false); },
          },
          {
            label: "تيليغرام",
            icon: (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2AABEE">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.56l-2.982-.924c-.648-.204-.66-.648.136-.961l11.647-4.492c.537-.194 1.006.131.833.958z"/>
              </svg>
            ),
            bg: "bg-[#E8F5FE]", color: "text-[#1a86c7]",
            action: () => { window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank"); setShowShare(false); },
          },
          {
            label: "فيسبوك",
            icon: (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            ),
            bg: "bg-[#E7F0FD]", color: "text-[#1877F2]",
            action: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank"); setShowShare(false); },
          },
          {
            label: "SMS",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            bg: "bg-green-50", color: "text-green-700",
            action: () => { window.open(`sms:?body=${encoded}`); setShowShare(false); },
          },
        ];

        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowShare(false)} />
            <div className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-2xl p-4 pb-10">
              <div className="w-9 h-1 bg-border rounded-full mx-auto mb-4" />
              <p className="font-display font-bold text-ink text-center mb-5">مشاركة الإعلان</p>
              <div className="flex justify-between gap-1">
                {options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={opt.action}
                    className="flex flex-col items-center gap-1.5 flex-1 active:scale-95 transition-transform"
                  >
                    <div className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center ${opt.color}`}>
                      {opt.icon}
                    </div>
                    <span className="text-[9px] font-semibold text-mist text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {/* Phone auth popup for chat */}
      <PhoneAuthPopup
        open={showPhoneAuth}
        onClose={() => setShowPhoneAuth(false)}
        onVerified={async () => {
          setShowPhoneAuth(false);
          await startChat();
        }}
      />

      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[60] flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-2">
          <div className="bg-ink/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg pointer-events-auto">
            {toast}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
