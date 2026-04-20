"use client";

import { useEffect, useRef, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ViewIcon, EditIcon, ApproveIcon, UnapproveIcon, RemoveIcon } from "@/components/admin/AdminActionIcons";
import { normalizeDigits } from "@/lib/normalize-digits";
import { uploadReceiptPhoto } from "@/lib/api/upload";

type Report = {
  id: string;
  product_id?: string;
  product?: { id?: string; name_ar?: string; unit?: string; unit_size?: number; category?: { icon?: string; name_ar?: string } };
  price?: number;
  currency?: string;
  status?: string;
  area?: { id?: string; name_ar?: string };
  store?: { name_ar?: string };
  store_name_raw?: string;
  store_address?: string;
  store_phone?: string;
  confirmation_count?: number;
  flag_count?: number;
  trust_score?: number;
  reported_at?: string;
  has_receipt?: boolean;
  receipt_photo_url?: string;
  reporter?: { id?: string; display_handle?: string; phone_number?: string; trust_level?: string };
};

type Product = { id: string; name_ar: string };
type Area = { id: string; name_ar: string };

const ADD_FORM_EMPTY = { product_id: "", area_id: "", price: "", store_name_raw: "", store_phone: "", store_address: "", receipt_photo_url: "" };

export default function AdminReportsPage() {
  const { toast } = useAdminToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const limit = 20;

  // Confirmation modals
  const [approveTarget, setApproveTarget] = useState<Report | null>(null);
  const [unapproveTarget, setUnapproveTarget] = useState<Report | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // +Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(ADD_FORM_EMPTY);
  const [addSaving, setAddSaving] = useState(false);
  const [addReceiptUploading, setAddReceiptUploading] = useState(false);
  const addReceiptRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [addOptionsLoading, setAddOptionsLoading] = useState(false);

  // Product search (typeahead)
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState("");
  const productSearchTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Report | null>(null);
  const [editForm, setEditForm] = useState(ADD_FORM_EMPTY);
  const [editSaving, setEditSaving] = useState(false);
  const [editFetching, setEditFetching] = useState(false);

  // Edit product search (typeahead)
  const [editProductQuery, setEditProductQuery] = useState("");
  const [editProductResults, setEditProductResults] = useState<Product[]>([]);
  const [editProductSearching, setEditProductSearching] = useState(false);
  const [showEditProductDropdown, setShowEditProductDropdown] = useState(false);
  const [editSelectedProductName, setEditSelectedProductName] = useState("");

  // Status dropdown
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // View: fetch price when product_id missing
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);

  function load() {
    const token = getAdminToken();
    setLoading(true);
    const params = new URLSearchParams({ filter, limit: String(limit), offset: String(offset) });
    if (filterProduct.trim()) params.set("search", filterProduct.trim());
    fetch(`/api/admin/reports?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        setReports(d?.reports ?? []);
        setTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filter, offset]);

  // Debounced server-side search when product filter changes
  const productFilterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (productFilterTimer.current) clearTimeout(productFilterTimer.current);
    productFilterTimer.current = setTimeout(() => {
      setOffset(0);
      load();
    }, 300);
    return () => { if (productFilterTimer.current) clearTimeout(productFilterTimer.current); };
  }, [filterProduct]);

  useEffect(() => {
    if (!showAddModal && !editTarget) return;
    setAddOptionsLoading(true);
    Promise.all([
      fetch("/api/products?all=1&limit=200").then((r) => r.json()).then((d) => d?.products ?? []).catch(() => []),
      fetch("/api/areas").then((r) => r.json()).then((d) => d?.areas ?? []).catch(() => []),
    ]).then(([prods, ars]) => {
      setProducts(prods);
      setAreas(ars);
    }).finally(() => setAddOptionsLoading(false));
  }, [showAddModal, editTarget]);

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (filterArea.trim()) {
      if (!(r.area?.name_ar ?? "").toLowerCase().includes(filterArea.trim().toLowerCase())) return false;
    }
    return true;
  });

  async function confirmApprove() {
    if (!approveTarget) return;
    const token = getAdminToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prices/${approveTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (res.ok) {
        toast("Report approved", "success");
        setApproveTarget(null);
        load();
      } else {
        const d = await res.json();
        toast(d?.message ?? "Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmUnapprove() {
    if (!unapproveTarget) return;
    const token = getAdminToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prices/${unapproveTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "pending" }),
      });
      if (res.ok) {
        toast("Approve removed", "success");
        setUnapproveTarget(null);
        load();
      } else {
        const d = await res.json();
        toast(d?.message ?? "Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const token = getAdminToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prices/${removeTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) {
        toast("Report rejected", "success");
        setReports((prev) => prev.map((r) => r.id === removeTarget.id ? { ...r, status: "rejected" } : r));
        setRemoveTarget(null);
      } else {
        const d = await res.json();
        toast(d?.message ?? "Action failed", "error");
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  }

  function openAddModal() {
    setAddForm(ADD_FORM_EMPTY);
    setShowAddModal(true);
  }

  async function openEditModal(r: Report) {
    setEditTarget(r);
    setEditFetching(true);
    try {
      const res = await fetch(`/api/prices/${r.id}`);
      const data = await res.json();
      if (res.ok && data) {
        setEditForm({
          product_id: data?.product_id ?? data?.product?.id ?? "",
          area_id: data?.area_id ?? data?.area?.id ?? "",
          price: data?.price != null ? String(data.price) : "",
          store_name_raw: data?.store_name_raw ?? "",
          store_phone: data?.store_phone ?? "",
          store_address: data?.store_address ?? "",
          receipt_photo_url: data?.receipt_photo_url ?? "",
        });
      } else {
        toast("Could not load report details", "error");
        setEditTarget(null);
      }
    } catch {
      toast("Could not load report details", "error");
      setEditTarget(null);
    } finally {
      setEditFetching(false);
    }
  }

  async function handleEditSubmit() {
    if (!editTarget) return;
    const token = getAdminToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    if (!editForm.product_id?.trim() || !editForm.area_id?.trim()) {
      toast("Select product and area", "error");
      return;
    }
    const priceNum = parseFloat(editForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast("Enter a valid price", "error");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/prices/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: editForm.product_id,
          area_id: editForm.area_id,
          price: priceNum,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Report updated", "success");
        setEditTarget(null);
        load();
      } else {
        toast(data?.message ?? "Failed to update report", "error");
      }
    } catch {
      toast("Failed to update report", "error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAddSubmit() {
    const token = getAdminToken();
    if (!token) {
      toast("Login required", "error");
      return;
    }
    if (!addForm.product_id?.trim() || !addForm.area_id?.trim()) {
      toast("Select product and area", "error");
      return;
    }
    const priceNum = parseFloat(addForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast("Enter a valid price", "error");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: addForm.product_id,
          area_id: addForm.area_id,
          price: priceNum,
          store_name_raw: addForm.store_name_raw.trim() || undefined,
          store_phone: addForm.store_phone.trim() || undefined,
          store_address: addForm.store_address.trim() || undefined,
          receipt_photo_url: addForm.receipt_photo_url || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Report added", "success");
        setShowAddModal(false);
        setAddForm(ADD_FORM_EMPTY);
        load();
      } else {
        toast(data?.message ?? "Failed to add report", "error");
      }
    } catch {
      toast("Failed to add report", "error");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleView(r: Report) {
    const productId = r.product_id ?? r.product?.id;
    if (productId) {
      window.open(`/product/${productId}`, "_blank");
      return;
    }
    setViewLoadingId(r.id);
    try {
      const res = await fetch(`/api/prices/${r.id}`);
      const data = await res.json();
      const pid = data?.product?.id;
      if (pid) {
        window.open(`/product/${pid}`, "_blank");
      } else {
        toast("Could not load product", "error");
      }
    } catch {
      toast("Could not load product", "error");
    } finally {
      setViewLoadingId(null);
    }
  }

  async function handleStatusChange(r: Report, newStatus: string) {
    const token = getAdminToken();
    if (!token) { toast("Login required", "error"); return; }
    setStatusDropdownId(null);
    setLoadingStatusId(r.id);
    try {
      const res = await fetch(`/api/admin/prices/${r.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus } : x));
        toast("Status updated", "success");
      } else {
        const d = await res.json();
        toast(d?.message ?? "Failed", "error");
      }
    } catch {
      toast("Failed", "error");
    } finally {
      setLoadingStatusId(null);
    }
  }

  function statusBadge(status?: string) {
    const cls = status === "confirmed"
      ? "border-[#4A7C5935] bg-[#4A7C5920] text-[#6BA880]"
      : status === "rejected"
        ? "border-[#A8585235] bg-[#A8585218] text-[#D49088]"
        : "border-[#D4913A35] bg-[#D4913A18] text-[#E8B870]";
    const dot = status === "confirmed" ? "🟢" : status === "rejected" ? "🔴" : "🟡";
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>
        <span className="text-[8px]">{dot}</span> {status ?? "—"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-10">#</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                      <div className="relative inline-flex items-center gap-1">
                        Product
                        <button onClick={() => setOpenFilter(openFilter === "product" ? null : "product")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterProduct ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                        </button>
                        {openFilter === "product" && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                            <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                              <input
                                autoFocus
                                type="text"
                                value={filterProduct}
                                onChange={(e) => setFilterProduct(e.target.value)}
                                placeholder="Filter product..."
                                className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal"
                              />
                              {filterProduct && (
                                <button onClick={() => { setFilterProduct(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Price</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Store</th>
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
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reporter</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                      <div className="relative inline-flex items-center gap-1">
                        Status
                        <button onClick={() => setOpenFilter(openFilter === "status" ? null : "status")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${statusFilter !== "all" ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                        </button>
                        {openFilter === "status" && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                            <div className="absolute left-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              {[{ v: "all", l: "All" }, { v: "confirmed", l: "🟢 Confirmed" }, { v: "pending", l: "🟡 Pending" }, { v: "rejected", l: "🔴 Rejected" }].map((o) => (
                                <button
                                  key={o.v}
                                  onClick={() => { setStatusFilter(o.v); setOpenFilter(null); }}
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
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Date</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Trust</th>
                    <th className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => load()}
                          className="w-7 h-7 rounded-full border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors inline-flex items-center justify-center"
                          title="Reload"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                        </button>
                        <button
                          onClick={openAddModal}
                          className="w-7 h-7 rounded-full bg-[#4A7C59] text-white hover:bg-[#3A6347] transition-colors inline-flex items-center justify-center"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 && (
                    <tr><td colSpan={10} className="py-12 text-center text-sm text-[#4E6070]">{reports.length > 0 ? "No reports match filters" : "No reports"}</td></tr>
                  )}
                  {filteredReports.map((r, i) => (
                    <tr key={r.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-3 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-[#D8E4F0]">{r.product?.name_ar ?? "—"}</div>
                        {r.product?.unit && <div className="text-[10px] text-[#4E6070]">{r.product.unit_size} {r.product.unit}</div>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-[#D8E4F0]">₪{r.price ?? "—"}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-[#D8E4F0]">{r.store?.name_ar ?? r.store_name_raw ?? "—"}</div>
                        {r.store_phone && <div className="text-[10px] text-[#4E6070] font-mono" dir="ltr">{normalizeDigits(r.store_phone)}</div>}
                        {r.store_address && <div className="text-[10px] text-[#4E6070] truncate max-w-[120px]" title={r.store_address}>{r.store_address}</div>}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#8FA3B8]">{r.area?.name_ar ?? "—"}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-[#D8E4F0]">{r.reporter?.display_handle ?? "—"}</div>
                        {r.reporter?.phone_number && <div className="text-[10px] text-[#4E6070] font-mono" dir="ltr">{normalizeDigits(r.reporter.phone_number)}</div>}
                        {r.reporter?.trust_level && <div className="text-[9px] text-[#4E6070] uppercase">{r.reporter.trust_level}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative">
                          {loadingStatusId === r.id ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#243040] bg-[#18212C] px-2.5 py-0.5 text-[10px] text-[#8FA3B8]">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusDropdownId(statusDropdownId === r.id ? null : r.id)}
                              className="cursor-pointer"
                            >
                              {statusBadge(r.status)}
                            </button>
                          )}
                          {statusDropdownId === r.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setStatusDropdownId(null)} />
                              <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                {r.status !== "confirmed" && (
                                  <button type="button" onClick={() => handleStatusChange(r, "confirmed")} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">🟢 Confirmed</button>
                                )}
                                {r.status !== "pending" && (
                                  <button type="button" onClick={() => handleStatusChange(r, "pending")} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">🟡 Pending</button>
                                )}
                                {r.status !== "rejected" && (
                                  <button type="button" onClick={() => handleStatusChange(r, "rejected")} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">🔴 Rejected</button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-[#4E6070] whitespace-nowrap">
                        {r.reported_at ? new Date(r.reported_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-[#8FA3B8]">{r.trust_score ?? 0}</span>
                          {r.has_receipt && <span title="Has receipt" className="text-[10px]">🧾</span>}
                          {(r.confirmation_count ?? 0) > 0 && <span className="text-[10px] text-[#6BA880]">✓{r.confirmation_count}</span>}
                          {(r.flag_count ?? 0) > 0 && <span className="text-[10px] text-[#D49088]">⚑{r.flag_count}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === r.id ? null : r.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                          </button>
                          {actionMenuId === r.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                <button onClick={() => { handleView(r); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">
                                  👁 View
                                </button>
                                <button onClick={() => { openEditModal(r); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">
                                  ✏️ Edit
                                </button>
                                {r.status === "pending" && (
                                  <button onClick={() => { setApproveTarget(r); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#6BA880] hover:bg-[#243040] flex items-center gap-2">
                                    ✅ Approve
                                  </button>
                                )}
                                {r.status === "confirmed" && (
                                  <button onClick={() => { setUnapproveTarget(r); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#E8B870] hover:bg-[#243040] flex items-center gap-2">
                                    ⏸ Unapprove
                                  </button>
                                )}
                                {r.status !== "rejected" && (
                                  <>
                                    <div className="h-px bg-[#243040] my-1" />
                                    <button onClick={() => { setRemoveTarget(r); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D49088] hover:bg-[#243040] flex items-center gap-2">
                                      🗑 Remove
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
        {total > limit && (
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-[#4E6070]">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

      {/* Unapprove confirmation */}
      {unapproveTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !actionLoading && setUnapproveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Approve</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to remove the approval from &ldquo;{unapproveTarget.product?.name_ar ?? "—"}&rdquo; (₪{unapproveTarget.price})? The report will go back to pending.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setUnapproveTarget(null)} disabled={actionLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmUnapprove} disabled={actionLoading} className="flex-1 rounded-lg border border-[#D4913A] bg-[#D4913A18] px-4 py-2 text-sm font-medium text-[#E8B870] hover:bg-[#D4913A28] disabled:opacity-50">{actionLoading ? "..." : "Yes, Unapprove"}</button>
            </div>
          </div>
        </>
      )}

      {/* Approve confirmation */}
      {approveTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !actionLoading && setApproveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Approve Report</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to approve this price report for &ldquo;{approveTarget.product?.name_ar ?? "—"}&rdquo; (₪{approveTarget.price})? The price will remain active.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setApproveTarget(null)} disabled={actionLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmApprove} disabled={actionLoading} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{actionLoading ? "..." : "Yes, Approve"}</button>
            </div>
          </div>
        </>
      )}

      {/* Remove confirmation */}
      {removeTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !actionLoading && setRemoveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove Report</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to remove this price report for &ldquo;{removeTarget.product?.name_ar ?? "—"}&rdquo; (₪{removeTarget.price})? The price will be rejected.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} disabled={actionLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmRemove} disabled={actionLoading} className="flex-1 rounded-lg border border-[#A85852] bg-[#A8585218] px-4 py-2 text-sm font-medium text-[#D49088] hover:bg-[#A8585228] disabled:opacity-50 transition-colors">{actionLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !editSaving && !editFetching && setEditTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Edit Price Report</h3>
            {editFetching ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Product</label>
                    <select
                      value={editForm.product_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, product_id: e.target.value }))}
                      disabled={addOptionsLoading}
                      className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59] disabled:opacity-70"
                    >
                      <option value="">{addOptionsLoading ? "Loading..." : "Select product..."}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Area</label>
                    <select
                      value={editForm.area_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, area_id: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">Select area...</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Price (₪)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                      dir="ltr"
                      lang="en"
                      className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                    />
                    <p className="mt-1 text-[10px] text-[#4E6070]">Use English digits (0-9) only</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setEditTarget(null)} disabled={editSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={handleEditSubmit} disabled={editSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{editSaving ? "..." : "Save"}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* +Add modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !addSaving && setShowAddModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Add Price Report</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Product</label>
                <select
                  value={addForm.product_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, product_id: e.target.value }))}
                  disabled={addOptionsLoading}
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59] disabled:opacity-70"
                >
                  <option value="">{addOptionsLoading ? "Loading products..." : "Select product..."}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Area</label>
                <select
                  value={addForm.area_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, area_id: e.target.value }))}
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                >
                  <option value="">Select area...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Price (₪)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={addForm.price}
                  onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  dir="ltr"
                  lang="en"
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Store Name</label>
                <input
                  type="text"
                  value={addForm.store_name_raw}
                  onChange={(e) => setAddForm((f) => ({ ...f, store_name_raw: e.target.value }))}
                  placeholder="اسم المتجر"
                  dir="rtl"
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Store Phone</label>
                <input
                  type="tel"
                  value={addForm.store_phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, store_phone: normalizeDigits(e.target.value) }))}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Store Address</label>
                <input
                  type="text"
                  value={addForm.store_address}
                  onChange={(e) => setAddForm((f) => ({ ...f, store_address: e.target.value }))}
                  placeholder="العنوان (اختياري)"
                  dir="rtl"
                  className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-3 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4E6070] mb-1">Proof Image</label>
                <input ref={addReceiptRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { toast("Max 5MB", "error"); return; }
                  setAddReceiptUploading(true);
                  try {
                    const token = getAdminToken();
                    const url = await uploadReceiptPhoto(file, token);
                    setAddForm((f) => ({ ...f, receipt_photo_url: url }));
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Upload failed", "error");
                  } finally {
                    setAddReceiptUploading(false);
                  }
                }} />
                {addReceiptUploading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[#243040] bg-[#111820] px-3 py-2.5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                    <span className="text-xs text-[#8FA3B8]">Uploading...</span>
                  </div>
                ) : addForm.receipt_photo_url ? (
                  <div className="flex items-center justify-between rounded-lg border border-[#4A7C59] bg-[#111820] px-3 py-2">
                    <span className="text-xs text-[#6BA880]">Uploaded</span>
                    <button type="button" onClick={() => setAddForm((f) => ({ ...f, receipt_photo_url: "" }))} className="text-xs text-[#D49088] hover:text-[#E8B870]">Remove</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addReceiptRef.current?.click()}
                    className="w-full rounded-lg border border-dashed border-[#243040] bg-[#111820] px-3 py-2.5 text-xs text-[#8FA3B8] hover:border-[#4A7C59] hover:text-[#D8E4F0] transition-colors"
                  >
                    Click to upload proof image
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShowAddModal(false)} disabled={addSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleAddSubmit} disabled={addSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{addSaving ? "..." : "Add"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
