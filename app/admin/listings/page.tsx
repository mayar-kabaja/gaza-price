"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useIsSuperAdmin } from "@/components/admin/AdminLayout";
import Image from "next/image";

const CATEGORY_OPTIONS = [
  { value: "electronics", label: "إلكترونيات" },
  { value: "clothes", label: "ملابس" },
  { value: "furniture", label: "أثاث" },
  { value: "food", label: "طعام" },
  { value: "books", label: "كتب" },
  { value: "tools", label: "أدوات" },
  { value: "toys", label: "ألعاب" },
  { value: "other", label: "أخرى" },
];

const CONDITION_OPTIONS = [
  { value: "new", label: "جديد" },
  { value: "used", label: "مستعمل" },
  { value: "urgent", label: "عاجل" },
];

const CONDITION_LABEL: Record<string, string> = { new: "جديد", used: "مستعمل", urgent: "عاجل" };

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  active:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sold:    "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

type Area = { id: string; name_ar: string };
type ListingImage = { id: string; url: string; sort_order: number };
type AdminListing = {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  status: string;
  is_negotiable: boolean;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  area: { id: string; name_ar: string } | null;
  seller: { id: string; display_handle: string | null };
  images: ListingImage[];
  created_at: string;
};

type ImageEntry =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

type EditForm = {
  title: string;
  price: string;
  category: string;
  condition: string;
  status: string;
  area_id: string;
  description: string;
  is_negotiable: boolean;
};

type AddForm = {
  seller_id: string;
  title: string;
  price: string;
  category: string;
  condition: string;
  status: string;
  area_id: string;
  description: string;
  is_negotiable: boolean;
};

const EDIT_EMPTY: EditForm = {
  title: "", price: "", category: "", condition: "used",
  status: "active", area_id: "", description: "", is_negotiable: false,
};

const ADD_EMPTY: AddForm = {
  seller_id: "", title: "", price: "", category: "other", condition: "used",
  status: "active", area_id: "", description: "", is_negotiable: false,
};

const LIMIT = 20;

const FilterIcon = ({ active }: { active: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={active ? "text-[#4A7C59]" : "text-[#4E6070]"}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
  </svg>
);

export default function AdminListingsPage() {
  const { toast } = useAdminToast();
  const isSuperAdmin = useIsSuperAdmin();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // Column filters
  const [filterTitle, setFilterTitle] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kebab menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<AdminListing | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EDIT_EMPTY);
  const [editImages, setEditImages] = useState<ImageEntry[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(ADD_EMPTY);
  const [addImages, setAddImages] = useState<{ file: File; preview: string }[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Seller search
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerResults, setSellerResults] = useState<{ id: string; display_handle: string | null; phone_number: string | null }[]>([]);
  const [sellerSelected, setSellerSelected] = useState<{ id: string; display_handle: string | null; phone_number: string | null } | null>(null);
  const [sellerSearching, setSellerSearching] = useState(false);
  const sellerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminListing | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Approve/reject loading
  const [actionId, setActionId] = useState<string | null>(null);

  // Status dropdown
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedTitle(filterTitle.trim());
      setOffset(0);
    }, 300);
  }, [filterTitle]);

  const fetchListings = useCallback(async (off = 0) => {
    setLoading(true);
    const token = getAdminToken();
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);
    if (debouncedTitle) params.set("search", debouncedTitle);
    try {
      const res = await fetch(`/api/admin/listings?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setListings(data.listings ?? []);
      setTotal(data.total ?? 0);
      setOffset(off);
    } catch {
      toast("فشل تحميل الإعلانات", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, debouncedTitle, toast]);

  useEffect(() => { fetchListings(0); }, [fetchListings]);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d?.areas ?? []))
      .catch(() => setAreas([]));
  }, []);

  // ── Approve ────────────────────────────────────────────────────────────────

  async function handleApprove(id: string) {
    setActionId(id);
    const token = getAdminToken();
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast("Approved ✓", "success");
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: "active" } : l));
    } catch {
      toast("Failed", "error");
    } finally {
      setActionId(null);
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────

  async function handleReject(id: string) {
    setActionId(id);
    const token = getAdminToken();
    try {
      const res = await fetch(`/api/admin/listings/${id}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast("Rejected", "success");
      setListings((prev) => prev.filter((l) => l.id !== id));
      setTotal((t) => t - 1);
    } catch {
      toast("Failed", "error");
    } finally {
      setActionId(null);
    }
  }

  // ── Status change ──────────────────────────────────────────────────────────

  async function handleStatusChange(id: string, status: string) {
    setStatusMenuId(null);
    setLoadingStatusId(id);
    const token = getAdminToken();
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    } catch {
      toast("Failed to update status", "error");
    } finally {
      setLoadingStatusId(null);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function openEditModal(listing: AdminListing) {
    setEditTarget(listing);
    const sorted = [...listing.images].sort((a, b) => a.sort_order - b.sort_order);
    setEditImages(sorted.map((img) => ({ kind: "existing" as const, url: img.url })));
    setEditForm({
      title: listing.title,
      price: String(listing.price),
      category: listing.category,
      condition: listing.condition,
      status: listing.status,
      area_id: listing.area?.id ?? "",
      description: listing.description ?? "",
      is_negotiable: listing.is_negotiable,
    });
    setShowEditConfirm(false);
  }

  function handleEditImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 4 - editImages.length;
    const toAdd = files.slice(0, remaining);
    setEditImages((prev) => [
      ...prev,
      ...toAdd.map((f) => ({ kind: "new" as const, file: f, preview: URL.createObjectURL(f) })),
    ]);
    e.target.value = "";
  }

  function removeEditImage(idx: number) {
    setEditImages((prev) => {
      const entry = prev[idx];
      if (entry.kind === "new") URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function uploadListingImage(file: File): Promise<string> {
    const token = getAdminToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/listing", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? "فشل رفع الصورة");
    if (typeof data?.url !== "string") throw new Error("لم يُرجَع رابط الصورة");
    return data.url;
  }

  async function confirmEdit() {
    if (!editTarget) return;
    setEditSaving(true);
    const token = getAdminToken();
    try {
      const image_urls = await Promise.all(
        editImages.map((e) => e.kind === "existing" ? e.url : uploadListingImage(e.file))
      );
      const res = await fetch(`/api/admin/listings/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editForm.title.trim(),
          price: parseFloat(editForm.price),
          category: editForm.category,
          condition: editForm.condition,
          status: editForm.status,
          area_id: editForm.area_id || null,
          description: editForm.description.trim() || null,
          is_negotiable: editForm.is_negotiable,
          image_urls,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const updated = data.data ?? data;
      setListings((prev) => prev.map((l) => l.id === editTarget.id ? { ...l, ...updated } : l));
      toast("Saved ✓", "success");
      setEditTarget(null);
    } catch {
      toast("Failed to save", "error");
    } finally {
      setEditSaving(false);
      setShowEditConfirm(false);
    }
  }

  // ── Add ────────────────────────────────────────────────────────────────────

  function handleAddImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 4 - addImages.length;
    const toAdd = files.slice(0, remaining);
    setAddImages((prev) => [
      ...prev,
      ...toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
    e.target.value = "";
  }

  function removeAddImage(idx: number) {
    setAddImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  useEffect(() => {
    if (sellerDebounceRef.current) clearTimeout(sellerDebounceRef.current);
    if (!sellerSearch.trim()) { setSellerResults([]); return; }
    sellerDebounceRef.current = setTimeout(async () => {
      setSellerSearching(true);
      try {
        const token = getAdminToken();
        const res = await fetch(`/api/admin/contributors?limit=6&offset=0&search=${encodeURIComponent(sellerSearch.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        setSellerResults(d?.contributors ?? []);
      } catch { setSellerResults([]); }
      finally { setSellerSearching(false); }
    }, 300);
  }, [sellerSearch]);

  async function confirmAdd() {
    setAddSaving(true);
    const token = getAdminToken();
    let sellerId = addForm.seller_id.trim();
    if (!sellerId) {
      try {
        const meRes = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } });
        const me = await meRes.json();
        sellerId = me?.id ?? me?.data?.id ?? "";
      } catch { /* ignore */ }
    }
    if (!sellerId) {
      toast("Could not determine seller", "error");
      setAddSaving(false);
      setShowAddConfirm(false);
      return;
    }
    try {
      const image_urls = await Promise.all(addImages.map((img) => uploadListingImage(img.file)));
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          seller_id: sellerId,
          title: addForm.title.trim(),
          price: parseFloat(addForm.price),
          category: addForm.category,
          condition: addForm.condition,
          status: addForm.status,
          area_id: addForm.area_id || null,
          description: addForm.description.trim() || null,
          is_negotiable: addForm.is_negotiable,
          image_urls,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.message ?? "Failed");
      }
      toast("Listing created ✓", "success");
      addImages.forEach((img) => URL.revokeObjectURL(img.preview));
      setShowAddModal(false);
      setShowAddConfirm(false);
      setAddForm(ADD_EMPTY);
      setAddImages([]);
      fetchListings(0);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setAddSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const token = getAdminToken();
    try {
      const res = await fetch(`/api/admin/listings/${deleteTarget.id}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast("Deleted", "success");
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch {
      toast("Failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const inputClass = "w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]";
  const labelClass = "block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider";

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#D8E4F0]">Listings</h1>
          <p className="text-xs text-[#4E6070] mt-0.5">
            {loading ? "Loading..." : `${total} listing${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => fetchListings(offset)}
          className="text-xs px-3 py-1.5 rounded-md bg-[#18212C] text-[#8FA3B8] hover:text-[#D8E4F0] border border-[#243040] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full min-w-[800px] text-xs">
              <thead>
                <tr className="border-b border-[#243040] sticky top-0 bg-[#111820] z-10">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-10">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-10"></th>

                  {/* Title filter */}
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Listing
                      <button onClick={() => setOpenFilter(openFilter === "title" ? null : "title")} className="p-0.5 rounded hover:bg-[#243040] transition-colors">
                        <FilterIcon active={!!filterTitle} />
                      </button>
                      {openFilter === "title" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-52 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                            <input
                              autoFocus
                              type="text"
                              value={filterTitle}
                              onChange={(e) => setFilterTitle(e.target.value)}
                              placeholder="Search title..."
                              className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal"
                            />
                            {filterTitle && (
                              <button onClick={() => { setFilterTitle(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </th>

                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Price</th>

                  {/* Category filter */}
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Category
                      <button onClick={() => setOpenFilter(openFilter === "category" ? null : "category")} className="p-0.5 rounded hover:bg-[#243040] transition-colors">
                        <FilterIcon active={!!filterCategory} />
                      </button>
                      {openFilter === "category" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                            {[{ v: "", l: "All" }, ...CATEGORY_OPTIONS.map((o) => ({ v: o.value, l: o.label }))].map((o) => (
                              <button
                                key={o.v}
                                onClick={() => { setFilterCategory(o.v); setOffset(0); setOpenFilter(null); }}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#243040] font-normal normal-case tracking-normal ${filterCategory === o.v ? "text-[#4A7C59]" : "text-[#D8E4F0]"}`}
                              >
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>

                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Seller</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Phone</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>

                  {/* Status filter */}
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Status
                      <button onClick={() => setOpenFilter(openFilter === "status" ? null : "status")} className="p-0.5 rounded hover:bg-[#243040] transition-colors">
                        <FilterIcon active={!!filterStatus} />
                      </button>
                      {openFilter === "status" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                            {[{ v: "", l: "All" }, { v: "pending", l: "🟡 Pending" }, { v: "active", l: "🟢 Active" }, { v: "sold", l: "⚫ Sold" }].map((o) => (
                              <button
                                key={o.v}
                                onClick={() => { setFilterStatus(o.v); setOffset(0); setOpenFilter(null); }}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#243040] font-normal normal-case tracking-normal ${filterStatus === o.v ? "text-[#4A7C59]" : "text-[#D8E4F0]"}`}
                              >
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>

                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Date</th>

                  {/* Add button in header */}
                  <th className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => { setAddForm(ADD_EMPTY); setAddImages([]); setSellerSearch(""); setSellerResults([]); setSellerSelected(null); setShowAddConfirm(false); setShowAddModal(true); }}
                      className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center"
                      title="Add listing"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-[#4E6070]">No listings found</td></tr>
                ) : listings.map((listing, i) => {
                  const sortedImages = [...listing.images].sort((a, b) => a.sort_order - b.sort_order);
                  const date = new Date(listing.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                  return (
                    <tr key={listing.id} className="border-b border-[#243040] hover:bg-[#18212C] transition-colors">
                      <td className="px-3 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>

                      {/* Thumbnail */}
                      <td className="px-3 py-2">
                        <div className="w-9 h-9 rounded-lg bg-[#0B0F14] relative overflow-hidden flex-shrink-0">
                          {sortedImages[0] ? (
                            <Image src={sortedImages[0].url} alt="" fill className="object-cover" sizes="36px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                          )}
                        </div>
                      </td>

                      {/* Title + condition */}
                      <td className="px-3 py-3 max-w-[180px]">
                        <p className="text-[#D8E4F0] font-medium truncate">{listing.title}</p>
                        <p className="text-[#4E6070] mt-0.5">{CONDITION_LABEL[listing.condition] ?? listing.condition}</p>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-3 text-[#6BA880] font-semibold" dir="ltr">
                        ₪{Number(listing.price).toLocaleString()}
                        {listing.is_negotiable && <span className="text-[#4E6070] font-normal ml-1">neg.</span>}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 text-[#8FA3B8]">
                        {CATEGORY_OPTIONS.find((c) => c.value === listing.category)?.label ?? listing.category}
                      </td>

                      {/* Seller */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 group">
                          <span className="text-[#8FA3B8] font-mono text-[11px]">
                            {listing.seller.display_handle ?? listing.seller.id.slice(0, 8)}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(listing.seller.id).then(() => toast("ID copied", "success"))}
                            title={listing.seller.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[#4E6070] hover:text-[#D8E4F0]"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-3 py-3 text-[#8FA3B8] font-mono text-[11px]">
                        {listing.phone ?? listing.whatsapp ?? "—"}
                      </td>

                      {/* Area */}
                      <td className="px-3 py-3 text-[#8FA3B8]">
                        {listing.area?.name_ar ?? "—"}
                      </td>

                      {/* Status — clickable dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative">
                          {loadingStatusId === listing.id ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#243040] bg-[#18212C] px-2.5 py-0.5 text-[10px] text-[#8FA3B8]">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusMenuId(statusMenuId === listing.id ? null : listing.id)}
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize cursor-pointer ${STATUS_BADGE[listing.status] ?? "bg-[#18212C] text-[#8FA3B8] border-[#243040]"}`}
                            >
                              {listing.status}
                            </button>
                          )}
                          {statusMenuId === listing.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setStatusMenuId(null)} />
                              <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                {[{ v: "pending", l: "🟡 Pending" }, { v: "active", l: "🟢 Active" }, { v: "sold", l: "⚫ Sold" }]
                                  .filter((o) => o.v !== listing.status)
                                  .map((o) => (
                                    <button
                                      key={o.v}
                                      onClick={() => handleStatusChange(listing.id, o.v)}
                                      className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                    >
                                      {o.l}
                                    </button>
                                  ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 text-[#4E6070]">{date}</td>

                      {/* Kebab menu */}
                      <td className="px-3 py-3 text-center">
                        <div className="relative flex justify-center">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === listing.id ? null : listing.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                            disabled={actionId === listing.id}
                          >
                            {actionId === listing.id ? (
                              <div className="w-3.5 h-3.5 border border-[#8FA3B8]/40 border-t-[#8FA3B8] rounded-full animate-spin" />
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                              </svg>
                            )}
                          </button>
                          {actionMenuId === listing.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                <button
                                  onClick={() => { openEditModal(listing); setActionMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                >
                                  ✏️ Edit
                                </button>
                                {listing.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => { handleApprove(listing.id); setActionMenuId(null); }}
                                      className="w-full px-3 py-2 text-left text-xs text-[#6BA880] hover:bg-[#243040] flex items-center gap-2"
                                    >
                                      ✅ Approve
                                    </button>
                                    <button
                                      onClick={() => { handleReject(listing.id); setActionMenuId(null); }}
                                      className="w-full px-3 py-2 text-left text-xs text-[#E8B870] hover:bg-[#243040] flex items-center gap-2"
                                    >
                                      ❌ Reject
                                    </button>
                                  </>
                                )}
                                {isSuperAdmin && <>
                                <div className="h-px bg-[#243040] my-1" />
                                <button
                                  onClick={() => { setDeleteTarget(listing); setActionMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-xs text-[#D49088] hover:bg-[#243040] flex items-center gap-2"
                                >
                                  🗑 Delete
                                </button>
                                </>}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <button onClick={() => fetchListings(Math.max(0, offset - LIMIT))} disabled={offset === 0} className="rounded-lg border border-[#243040] px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-30">Previous</button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => fetchListings((page - 1) * LIMIT)} className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${page === currentPage ? "bg-[#4A7C59] text-white" : "text-[#8FA3B8] hover:bg-[#18212C]"}`}>{page}</button>
            ))}
          </div>
          <button onClick={() => fetchListings(offset + LIMIT)} disabled={offset + LIMIT >= total} className="rounded-lg border border-[#243040] px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-30">Next</button>
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !showEditConfirm && setEditTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-[#243040]">
              <h3 className="text-sm font-bold text-[#D8E4F0]">Edit Listing</h3>
              <button onClick={() => setEditTarget(null)} className="text-[#4E6070] hover:text-[#D8E4F0] text-lg">×</button>
            </div>
            {!showEditConfirm ? (
              <>
                <div className="overflow-y-auto flex-1 p-5 space-y-3">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input type="text" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Price (₪)</label>
                      <input type="number" min="0" step="0.01" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Category</label>
                      <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className={inputClass}>
                        {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Condition</label>
                      <select value={editForm.condition} onChange={(e) => setEditForm((f) => ({ ...f, condition: e.target.value }))} className={inputClass}>
                        {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Area</label>
                    <select value={editForm.area_id} onChange={(e) => setEditForm((f) => ({ ...f, area_id: e.target.value }))} className={inputClass}>
                      <option value="">— No area —</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_negotiable} onChange={(e) => setEditForm((f) => ({ ...f, is_negotiable: e.target.checked }))} className="rounded" />
                    <span className="text-xs text-[#8FA3B8]">Negotiable</span>
                  </label>

                  {/* Images */}
                  <div>
                    <label className={labelClass}>Images ({editImages.length}/4)</label>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleEditImagePick}
                    />
                    <div className="flex flex-wrap gap-2">
                      {editImages.map((entry, idx) => {
                        const src = entry.kind === "existing" ? entry.url : entry.preview;
                        return (
                          <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#243040] bg-[#0B0F14] flex-shrink-0">
                            <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                            <button
                              type="button"
                              onClick={() => removeEditImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                      {editImages.length < 4 && (
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-[#243040] text-[#4E6070] hover:border-[#4A7C59] hover:text-[#6BA880] transition-colors flex flex-col items-center justify-center gap-1 flex-shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                          </svg>
                          <span className="text-[10px]">Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-5 pt-4 border-t border-[#243040]">
                  <button onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-lg border border-[#243040] bg-[#111820] text-sm text-[#8FA3B8] hover:text-[#D8E4F0]">Cancel</button>
                  <button onClick={() => setShowEditConfirm(true)} disabled={!editForm.title.trim() || !editForm.price} className="px-4 py-2 rounded-lg bg-[#4A7C59] text-sm text-white hover:bg-[#3d6b4a] disabled:opacity-40">Save Changes</button>
                </div>
              </>
            ) : (
              <div className="p-5">
                <p className="text-sm text-[#8FA3B8] mb-5">Save changes to this listing?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowEditConfirm(false)} className="px-4 py-2 rounded-lg border border-[#243040] bg-[#111820] text-sm text-[#8FA3B8] hover:text-[#D8E4F0]">Back</button>
                  <button onClick={confirmEdit} disabled={editSaving} className="px-4 py-2 rounded-lg bg-[#4A7C59] text-sm text-white hover:bg-[#3d6b4a] disabled:opacity-40 flex items-center gap-2">
                    {editSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    Confirm Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add modal ──────────────────────────────────────────────────────── */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !showAddConfirm && setShowAddModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-[#243040]">
              <h3 className="text-sm font-bold text-[#D8E4F0]">Add Listing</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#4E6070] hover:text-[#D8E4F0] text-lg">×</button>
            </div>
            {!showAddConfirm ? (
              <>
                <div className="overflow-y-auto flex-1 p-5 space-y-3">
                  <div>
                    <label className={labelClass}>Seller (leave empty to use admin)</label>
                    {sellerSelected ? (
                      <div className="flex items-center justify-between rounded-lg border border-[#4A7C59] bg-[#111820] px-3 py-2">
                        <div>
                          <p className="text-sm text-[#D8E4F0] font-medium font-mono">{sellerSelected.phone_number ?? sellerSelected.display_handle ?? "—"}</p>
                          <p className="text-[10px] text-[#4E6070] mt-0.5">{sellerSelected.display_handle ?? sellerSelected.id.slice(0, 8)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSellerSelected(null); setAddForm((f) => ({ ...f, seller_id: "" })); setSellerSearch(""); }}
                          className="text-[#4E6070] hover:text-[#D8E4F0] text-lg ml-3"
                        >×</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={sellerSearch}
                          onChange={(e) => setSellerSearch(e.target.value)}
                          placeholder="Search by phone number..."
                          className={inputClass}
                          autoComplete="off"
                        />
                        {sellerSearching && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                        )}
                        {sellerResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1 max-h-40 overflow-y-auto">
                            {sellerResults.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => { setSellerSelected(s); setAddForm((f) => ({ ...f, seller_id: s.id })); setSellerSearch(""); setSellerResults([]); }}
                                className="w-full px-3 py-2 text-left hover:bg-[#243040] flex items-center justify-between gap-2"
                              >
                                <span className="text-sm text-[#D8E4F0] font-mono">{s.phone_number ?? "—"}</span>
                                <span className="text-xs text-[#4E6070]">{s.display_handle ?? s.id.slice(0, 8)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input type="text" value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Price (₪)</label>
                      <input type="number" min="0" step="0.01" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select value={addForm.status} onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Category</label>
                      <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} className={inputClass}>
                        {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Condition</label>
                      <select value={addForm.condition} onChange={(e) => setAddForm((f) => ({ ...f, condition: e.target.value }))} className={inputClass}>
                        {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Area</label>
                    <select value={addForm.area_id} onChange={(e) => setAddForm((f) => ({ ...f, area_id: e.target.value }))} className={inputClass}>
                      <option value="">— No area —</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={addForm.is_negotiable} onChange={(e) => setAddForm((f) => ({ ...f, is_negotiable: e.target.checked }))} className="rounded" />
                    <span className="text-xs text-[#8FA3B8]">Negotiable</span>
                  </label>

                  {/* Images */}
                  <div>
                    <label className={labelClass}>Images ({addImages.length}/4)</label>
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleAddImagePick}
                    />
                    <div className="flex flex-wrap gap-2">
                      {addImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#243040] bg-[#0B0F14] flex-shrink-0">
                          <Image src={img.preview} alt="" fill className="object-cover" sizes="80px" />
                          <button
                            type="button"
                            onClick={() => removeAddImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                      {addImages.length < 4 && (
                        <button
                          type="button"
                          onClick={() => addFileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-[#243040] text-[#4E6070] hover:border-[#4A7C59] hover:text-[#6BA880] transition-colors flex flex-col items-center justify-center gap-1 flex-shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                          </svg>
                          <span className="text-[10px]">Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-5 pt-4 border-t border-[#243040]">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-[#243040] bg-[#111820] text-sm text-[#8FA3B8] hover:text-[#D8E4F0]">Cancel</button>
                  <button onClick={() => setShowAddConfirm(true)} disabled={!addForm.seller_id.trim() || !addForm.title.trim() || !addForm.price} className="px-4 py-2 rounded-lg bg-[#4A7C59] text-sm text-white hover:bg-[#3d6b4a] disabled:opacity-40">Create Listing</button>
                </div>
              </>
            ) : (
              <div className="p-5">
                <p className="text-sm text-[#8FA3B8] mb-5">Create this listing for seller <span className="text-[#D8E4F0] font-mono">{addForm.seller_id.slice(0, 12)}…</span>?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddConfirm(false)} className="px-4 py-2 rounded-lg border border-[#243040] bg-[#111820] text-sm text-[#8FA3B8] hover:text-[#D8E4F0]">Back</button>
                  <button onClick={confirmAdd} disabled={addSaving} className="px-4 py-2 rounded-lg bg-[#4A7C59] text-sm text-white hover:bg-[#3d6b4a] disabled:opacity-40 flex items-center gap-2">
                    {addSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    Confirm Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !deleteLoading && setDeleteTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-base font-semibold text-[#D8E4F0] mb-2">Delete Listing</h3>
            <p className="text-sm text-[#8FA3B8] mb-1">Are you sure you want to delete:</p>
            <p className="text-sm font-medium text-[#D8E4F0] mb-5 truncate">"{deleteTarget.title}"</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="px-4 py-2 rounded-lg border border-[#243040] bg-[#111820] text-sm text-[#8FA3B8] hover:text-[#D8E4F0] disabled:opacity-40">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} className="px-4 py-2 rounded-lg bg-[#8B3A3A] text-sm text-white hover:bg-[#7a3030] disabled:opacity-40 flex items-center gap-2">
                {deleteLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
