"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useIsSuperAdmin } from "@/components/admin/AdminLayout";
import { useAdminPlaces, useAreas } from "@/lib/queries/hooks";
import { apiFetchAdmin } from "@/lib/api/fetch";

const PAGE_SIZE = 20;

const FOOD_TYPE_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "both", label: "Both" },
];

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

export default function AdminPlacesPage() {
  const { toast } = useAdminToast();
  const isSuperAdmin = useIsSuperAdmin();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterName, setFilterName] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterArea, setFilterArea] = useState("");

  // Debounce filterName for server-side search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(filterName.trim());
      setOffset(0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filterName]);

  const { data, isLoading } = useAdminPlaces(statusFilter, PAGE_SIZE, offset, debouncedSearch);
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];
  const places = data?.data ?? [];
  const total = data?.total ?? 0;

  // Edit modal state
  const [editPlace, setEditPlace] = useState<typeof places[0] | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  // Add place modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSection, setAddSection] = useState("food");
  const [addType, setAddType] = useState("");
  const [addAreaId, setAddAreaId] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addWhatsapp, setAddWhatsapp] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Confirm delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  // Action menu state
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);
  const [loadingOpenId, setLoadingOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function updatePlaceLocally(id: string, patch: Record<string, unknown>) {
    queryClient.setQueriesData<typeof data>({ queryKey: ["admin", "places"] }, (old) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.map((p) => p.id === id ? { ...p, ...patch } : p) };
    });
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "places"] });
  }

  function openAddModal() {
    setAddName(""); setAddSection("food"); setAddType(""); setAddAreaId("");
    setAddPhone(""); setAddWhatsapp(""); setAddAddress("");
    setShowAddModal(true);
  }

  async function handleAddPlace() {
    if (!addName.trim() || !addType.trim() || !addAreaId) {
      toast("Name, type, and area are required"); return;
    }
    setAddSaving(true);
    try {
      const res = await apiFetchAdmin("/api/admin/places", {
        method: "POST",
        body: JSON.stringify({
          name: addName.trim(),
          section: addSection,
          type: addType.trim(),
          area_id: addAreaId,
          phone: addPhone.trim() || undefined,
          whatsapp: addWhatsapp.trim() || undefined,
          address: addAddress.trim() || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast(d?.message ?? "Failed to add"); return; }
      toast("Place added");
      setShowAddModal(false);
      invalidate();
    } catch { toast("Failed to add"); }
    setAddSaving(false);
  }

  function openDashboard(token: string) {
    const base = window.location.origin;
    window.open(`${base}/places/dashboard?token=${token}`, "_blank");
  }

  function openEdit(p: typeof places[0]) {
    setEditPlace(p);
    setEditName(p.name);
    setEditType(p.type);
    setEditSection(p.section);
    setEditAreaId(p.area_id ?? "");
    setEditPhone(p.phone ?? "");
    setEditWhatsapp(p.whatsapp ?? "");
    setEditAddress(p.address ?? "");
    setEditInstagram(p.instagram_url ?? "");
    setActionMenuId(null);
  }

  async function handleSaveEdit() {
    if (!editPlace) return;
    const isValidType =
      editSection === "store"
        ? STORE_TYPE_VALUES.includes(editType)
        : editSection === "workspace"
          ? editType === "workspace"
          : editSection === "food"
            ? FOOD_TYPE_OPTIONS.some((t) => t.value === editType)
            : false;
    if (!isValidType) {
      toast("Please select a valid Type for this Section");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string | boolean> = {};
      if (editName !== editPlace.name) body.name = editName;
      if (editType !== editPlace.type) body.type = editType;
      if (editSection !== editPlace.section) body.section = editSection;
      if (editAreaId !== (editPlace.area_id ?? "")) body.area_id = editAreaId;
      if (editPhone !== (editPlace.phone ?? "")) body.phone = editPhone;
      if (editWhatsapp !== (editPlace.whatsapp ?? "")) body.whatsapp = editWhatsapp;
      if (editAddress !== (editPlace.address ?? "")) body.address = editAddress;
      if (editInstagram !== (editPlace.instagram_url ?? "")) body.instagram_url = editInstagram;

      if (Object.keys(body).length === 0) { setEditPlace(null); return; }

      const res = await apiFetchAdmin(`/api/admin/places/${editPlace.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast("Place updated");
      updatePlaceLocally(editPlace.id, body);
      setEditPlace(null);
    } catch { toast("Error updating place"); }
    setSaving(false);
  }

  async function handleAction(id: string, action: "approve" | "suspend" | "pending") {
    setActionMenuId(null);
    setLoadingStatusId(id);
    const labels = { approve: "Place approved", suspend: "Place suspended", pending: "Place set to pending" };
    try {
      let res;
      if (action === "pending") {
        res = await apiFetchAdmin(`/api/admin/places/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "pending" }),
        });
      } else {
        res = await apiFetchAdmin(`/api/admin/places/${id}/${action}`, { method: "PATCH" });
      }
      if (!res.ok) throw new Error("Failed");
      toast(labels[action]);
      const newStatus = action === "approve" ? "active" : action === "suspend" ? "suspended" : "pending";
      updatePlaceLocally(id, { status: newStatus });
    } catch { toast("Action failed"); }
    setLoadingStatusId(null);
  }

  async function handleToggleOpen(p: typeof places[0]) {
    setActionMenuId(null);
    setLoadingOpenId(p.id);
    try {
      const res = await apiFetchAdmin(`/api/admin/places/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_open: !p.is_open }),
      });
      if (!res.ok) throw new Error("Failed");
      toast(p.is_open ? "Closed" : "Opened");
      updatePlaceLocally(p.id, { is_open: !p.is_open });
    } catch { toast("Toggle failed"); }
    setLoadingOpenId(null);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await apiFetchAdmin(`/api/admin/places/${deleteId}/suspend`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      toast("Place suspended");
      updatePlaceLocally(deleteId, { status: "suspended" });
      setDeleteId(null);
    } catch { toast("Delete failed"); }
    setDeleting(false);
  }

  const filteredPlaces = places.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (typeFilter) {
      const typeGroups: Record<string, string[]> = {
        restaurant: ["restaurant", "مطعم"],
        cafe: ["cafe", "كافيه", "مقهى"],
        both: ["both", "مطعم وكافيه"],
        workspace: ["workspace", "مساحة عمل"],
      };
      const allowed = typeGroups[typeFilter] ?? [typeFilter];
      if (!allowed.includes(p.type)) return false;
    }
    if (filterArea.trim()) {
      const q = filterArea.trim().toLowerCase();
      if (!(p.area?.name_ar ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string; dot: string }> = {
      active: { bg: "bg-[#4A7C5920] border-[#4A7C5935]", text: "text-[#6BA880]", label: "Active", dot: "🟢" },
      pending: { bg: "bg-[#C9A96E20] border-[#C9A96E35]", text: "text-[#C9A96E]", label: "Pending", dot: "🟡" },
      suspended: { bg: "bg-[#A8585218] border-[#A8585235]", text: "text-[#D49088]", label: "Suspended", dot: "🔴" },
    };
    const s = map[status] ?? { bg: "bg-[#334155] border-[#64748B35]", text: "text-[#94A3B8]", label: status, dot: "⚪" };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
        <span className="text-[8px]">{s.dot}</span> {s.label}
      </span>
    );
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const btnClass = "inline-flex items-center gap-1 rounded-lg border border-[#243040] bg-[#18212C] px-2.5 py-1.5 text-[10px] font-medium text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors whitespace-nowrap";

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820] flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#243040] sticky top-0 bg-[#111820] z-10">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Place
                      <button onClick={() => setOpenFilter(openFilter === "name" ? null : "name")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterName ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "name" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                            <input
                              autoFocus
                              type="text"
                              value={filterName}
                              onChange={(e) => setFilterName(e.target.value)}
                              placeholder="Filter name..."
                              className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal"
                            />
                            {filterName && (
                              <button onClick={() => { setFilterName(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Type
                      <button onClick={() => setOpenFilter(openFilter === "type" ? null : "type")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${typeFilter ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "type" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                            {[{ v: "", l: "All" }, { v: "restaurant", l: "🍽️ Restaurant" }, { v: "cafe", l: "☕ Cafe" }, { v: "both", l: "🍽️☕ Both" }, { v: "workspace", l: "💻 Workspace" }].map((o) => (
                              <button
                                key={o.v}
                                onClick={() => { setTypeFilter(o.v); setOffset(0); setOpenFilter(null); }}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#243040] flex items-center gap-2 font-normal normal-case tracking-normal ${typeFilter === o.v ? "text-[#4A7C59]" : "text-[#D8E4F0]"}`}
                              >
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Area
                      <button onClick={() => setOpenFilter(openFilter === "area" ? null : "area")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterArea ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "area" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                            <input
                              autoFocus
                              type="text"
                              value={filterArea}
                              onChange={(e) => setFilterArea(e.target.value)}
                              placeholder="Filter area..."
                              className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal"
                            />
                            {filterArea && (
                              <button onClick={() => { setFilterArea(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                    <div className="relative inline-flex items-center gap-1">
                      Status
                      <button onClick={() => setOpenFilter(openFilter === "status" ? null : "status")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${statusFilter ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </button>
                      {openFilter === "status" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                          <div className="absolute left-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                            {[{ v: "", l: "All" }, { v: "active", l: "🟢 Active" }, { v: "pending", l: "🟡 Pending" }, { v: "suspended", l: "🔴 Suspended" }].map((o) => (
                              <button
                                key={o.v}
                                onClick={() => { setStatusFilter(o.v); setOffset(0); setOpenFilter(null); }}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#243040] flex items-center gap-2 font-normal normal-case tracking-normal ${statusFilter === o.v ? "text-[#4A7C59]" : "text-[#D8E4F0]"}`}
                              >
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Open</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Instagram</th>
                  <th className="px-3 py-2.5 text-center">
                    <button
                      onClick={openAddModal}
                      className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaces.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-sm text-[#4E6070]">{places.length > 0 ? "No places match filters" : "No places"}</td></tr>
                )}
                {filteredPlaces.map((p, i) => (
                  <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                    <td className="px-3 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-[#D8E4F0]">{p.name}</div>
                      {p.phone && <div className="text-[10px] text-[#4E6070] mt-0.5 font-mono">{p.phone}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-full border border-[#243040] bg-[#18212C] px-2 py-0.5 text-[10px] font-medium text-[#8FA3B8]">
                        {p.section === "food" ? "🍽" : p.section === "workspace" ? "💻" : "🏪"} {({ restaurant: "Restaurant", مطعم: "Restaurant", cafe: "Cafe", كافيه: "Cafe", مقهى: "Cafe", both: "Both", "مطعم وكافيه": "Both", workspace: "Workspace", "مساحة عمل": "Workspace" } as Record<string, string>)[p.type] ?? p.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#8FA3B8]">{p.area?.name_ar ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="relative">
                        {loadingStatusId === p.id ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#243040] bg-[#18212C] px-2.5 py-0.5 text-[10px] text-[#8FA3B8]">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                          </span>
                        ) : (
                        <button
                          onClick={() => setStatusMenuId(statusMenuId === p.id ? null : p.id)}
                          className="cursor-pointer"
                        >
                          {statusBadge(p.status)}
                        </button>
                        )}
                        {statusMenuId === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setStatusMenuId(null)} />
                            <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              {p.status !== "active" && (
                                <button
                                  onClick={() => { handleAction(p.id, "approve"); setStatusMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                >
                                  🟢 Active
                                </button>
                              )}
                              {p.status !== "suspended" && (
                                <button
                                  onClick={() => { handleAction(p.id, "suspend"); setStatusMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                >
                                  🔴 Suspended
                                </button>
                              )}
                              {p.status !== "pending" && (
                                <button
                                  onClick={() => { handleAction(p.id, "pending"); setStatusMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                >
                                  🟡 Pending
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {loadingOpenId === p.id ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent inline-block" />
                      ) : (
                        <button onClick={() => handleToggleOpen(p)} className={`text-sm cursor-pointer ${p.is_open ? "text-[#6BA880]" : "text-[#D49088]"}`}>
                          {p.is_open ? "✓ Yes" : "✗ No"}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.instagram_url ? (
                        <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-[#8FA3B8] hover:text-[#D8E4F0]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#4E6070]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {actionMenuId === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              <button onClick={() => openEdit(p)} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">
                                ✏️ Edit
                              </button>
                              {p.owner_token && (
                                <button onClick={() => { openDashboard(p.owner_token!); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">
                                  🔗 Dashboard
                                </button>
                              )}
                              <button onClick={() => handleToggleOpen(p)} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">
                                {p.is_open ? "🔴 Close" : "🟢 Open"}
                              </button>
                              {p.status === "pending" && (
                                <button onClick={() => handleAction(p.id, "approve")} className="w-full px-3 py-2 text-left text-xs text-[#6BA880] hover:bg-[#243040] flex items-center gap-2">
                                  ✅ Approve
                                </button>
                              )}
                              {p.status === "active" && (
                                <button onClick={() => handleAction(p.id, "suspend")} className="w-full px-3 py-2 text-left text-xs text-[#C9A96E] hover:bg-[#243040] flex items-center gap-2">
                                  ⏸ Suspend
                                </button>
                              )}
                              {p.status === "suspended" && (
                                <button onClick={() => handleAction(p.id, "approve")} className="w-full px-3 py-2 text-left text-xs text-[#6BA880] hover:bg-[#243040] flex items-center gap-2">
                                  ✅ Reactivate
                                </button>
                              )}
                              {isSuperAdmin && p.status !== "suspended" && (
                                <>
                                  <div className="h-px bg-[#243040] my-1" />
                                  <button onClick={() => { setDeleteId(p.id); setDeleteName(p.name); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D49088] hover:bg-[#243040] flex items-center gap-2">
                                    🗑 Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0} className="rounded-lg border border-[#243040] px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-30">Previous</button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setOffset((page - 1) * PAGE_SIZE)} className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${page === currentPage ? "bg-[#4A7C59] text-white" : "text-[#8FA3B8] hover:bg-[#18212C]"}`}>{page}</button>
            ))}
          </div>
          <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total} className="rounded-lg border border-[#243040] px-3 py-1.5 text-xs text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Edit Modal */}
      {editPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditPlace(null)}>
          <div className="bg-[#111820] border border-[#243040] rounded-2xl w-full max-w-md mx-4 p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#D8E4F0]">Edit Place</h3>
              <button onClick={() => setEditPlace(null)} className="text-[#4E6070] hover:text-[#D8E4F0] text-lg">×</button>
            </div>
            <div className="space-y-3">
              <Field label="Name" value={editName} onChange={setEditName} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">Section</label>
                  <select
                    value={editSection}
                    onChange={(e) => {
                      const next = e.target.value;
                      setEditSection(next);
                      if (next === "store") {
                        if (!STORE_TYPE_VALUES.includes(editType)) setEditType(STORE_TYPE_VALUES[0] ?? "");
                      } else if (next === "workspace") {
                        setEditType("workspace");
                      } else {
                        if (!FOOD_TYPE_OPTIONS.some((t) => t.value === editType)) setEditType("restaurant");
                      }
                    }}
                    className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                  >
                    <option value="food">Food</option>
                    <option value="store">Store</option>
                    <option value="workspace">Workspace</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">Type</label>
                  {editSection === "store" ? (
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">Select store type...</option>
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
                  ) : editSection === "workspace" ? (
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="workspace">Workspace</option>
                    </select>
                  ) : (
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">Select type...</option>
                      {FOOD_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">Area</label>
                <select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
                  <option value="">—</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={editPhone} onChange={setEditPhone} />
                <Field label="WhatsApp" value={editWhatsapp} onChange={setEditWhatsapp} />
              </div>
              <Field label="Address" value={editAddress} onChange={setEditAddress} />
              <Field label="Instagram URL" value={editInstagram} onChange={setEditInstagram} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditPlace(null)} className="flex-1 rounded-lg border border-[#243040] py-2 text-xs font-medium text-[#8FA3B8] hover:bg-[#18212C]">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={
                  saving ||
                  (editSection === "store"
                    ? !STORE_TYPE_VALUES.includes(editType)
                    : editSection === "workspace"
                      ? editType !== "workspace"
                      : editSection === "food"
                        ? !FOOD_TYPE_OPTIONS.some((t) => t.value === editType)
                        : true)
                }
                className="flex-1 rounded-lg bg-[#4A7C59] py-2 text-xs font-bold text-white hover:bg-[#3A6347] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Place Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#111820] border border-[#243040] rounded-2xl w-full max-w-md mx-4 p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#D8E4F0]">Add Place</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#4E6070] hover:text-[#D8E4F0] text-lg">×</button>
            </div>
            <div className="space-y-3">
              <Field label="Name" value={addName} onChange={setAddName} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">Section</label>
                    <select
                      value={addSection}
                      onChange={(e) => {
                        const next = e.target.value;
                        setAddSection(next);
                        if (next === "store") setAddType(STORE_TYPE_VALUES[0] ?? "");
                        else if (next === "workspace") setAddType("workspace");
                        else setAddType("restaurant");
                      }}
                      className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                    <option value="food">Food</option>
                    <option value="store">Store</option>
                    <option value="workspace">Workspace</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">Type</label>
                    {addSection === "store" ? (
                      <select value={addType} onChange={(e) => setAddType(e.target.value)} className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
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
                    ) : addSection === "workspace" ? (
                      <select value={addType} onChange={(e) => setAddType(e.target.value)} className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
                        <option value="workspace">Workspace</option>
                      </select>
                    ) : (
                      <select value={addType} onChange={(e) => setAddType(e.target.value)} className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
                        <option value="">Select type...</option>
                        {FOOD_TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">Area</label>
                <select value={addAreaId} onChange={(e) => setAddAreaId(e.target.value)} className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]">
                  <option value="">—</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={addPhone} onChange={setAddPhone} />
                <Field label="WhatsApp" value={addWhatsapp} onChange={setAddWhatsapp} />
              </div>
              <Field label="Address" value={addAddress} onChange={setAddAddress} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg border border-[#243040] py-2 text-xs font-medium text-[#8FA3B8] hover:bg-[#18212C]">Cancel</button>
              <button onClick={handleAddPlace} disabled={addSaving} className="flex-1 rounded-lg bg-[#4A7C59] py-2 text-xs font-bold text-white hover:bg-[#3A6347] disabled:opacity-50">
                {addSaving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteId(null)}>
          <div className="bg-[#111820] border border-[#243040] rounded-2xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[#D49088] mb-2">Delete Place</h3>
            <p className="text-xs text-[#8FA3B8] mb-4">Are you sure you want to suspend <strong className="text-[#D8E4F0]">{deleteName}</strong>? It can be reactivated later.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="flex-1 rounded-lg border border-[#243040] py-2 text-xs font-medium text-[#8FA3B8] hover:bg-[#18212C] disabled:opacity-40">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-[#A85852] py-2 text-xs font-bold text-white hover:bg-[#8B4A45] disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {deleting ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-[#4E6070] mb-1 uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[38px] rounded-lg border border-[#243040] bg-[#18212C] px-3 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
      />
    </div>
  );
}
