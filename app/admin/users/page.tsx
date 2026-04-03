"use client";

import { useEffect, useRef, useState } from "react";
import { getAdminToken } from "@/lib/auth/token";
import { useAdminToast } from "@/components/admin/AdminToast";

type Area = { id: string; name_ar: string };
type Contributor = {
  id: string;
  display_handle: string | null;
  area: { id: string; name_ar: string } | null;
  trust_level: string;
  report_count: number;
  confirmation_count: number;
  is_banned: boolean;
  joined_at?: string;
  last_active_at?: string;
};

const TRUST_LEVELS = ["new", "regular", "trusted", "verified"] as const;
const FORM_EMPTY = { display_handle: "", area_id: "", trust_level: "new" };

export default function AdminUsersPage() {
  const { toast } = useAdminToast();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const prevSearchRef = useRef(search);
  const filterHandleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContributor, setEditingContributor] = useState<Contributor | null>(null);
  const [editForm, setEditForm] = useState(FORM_EMPTY);
  const [editSaving, setEditSaving] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  // Ban confirmation
  const [banTarget, setBanTarget] = useState<Contributor | null>(null);

  // Unban confirmation
  const [unbanTarget, setUnbanTarget] = useState<Contributor | null>(null);
  const [unbanLoading, setUnbanLoading] = useState(false);

  // Remove confirmation (soft delete = ban)
  const [removeTarget, setRemoveTarget] = useState<Contributor | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(FORM_EMPTY);
  const [addSaving, setAddSaving] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  // Clickable dropdowns
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [trustDropdownId, setTrustDropdownId] = useState<string | null>(null);
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);
  const [loadingTrustId, setLoadingTrustId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Column filters
  const [filterHandle, setFilterHandle] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterTrust, setFilterTrust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const limit = 20;

  function load(overrideOffset?: number) {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    const off = overrideOffset ?? offset;
    const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
    if (search.trim()) params.set("search", search.trim());
    else if (filterHandle.trim()) params.set("search", filterHandle.trim());
    fetch(`/api/admin/contributors?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setContributors(d?.contributors ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => toast("Failed to load", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (prevSearchRef.current !== search) {
      prevSearchRef.current = search;
      setOffset(0);
      load(0);
      return;
    }
    load();
  }, [search, offset]);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d?.areas ?? []))
      .catch(() => setAreas([]));
  }, []);

  // Debounced server-side search when filterHandle changes
  useEffect(() => {
    if (filterHandleTimerRef.current) clearTimeout(filterHandleTimerRef.current);
    filterHandleTimerRef.current = setTimeout(() => {
      setOffset(0);
      load(0);
    }, 300);
    return () => {
      if (filterHandleTimerRef.current) clearTimeout(filterHandleTimerRef.current);
    };
  }, [filterHandle]);

  function openAddModal() {
    setAddForm(FORM_EMPTY);
    setShowAddConfirm(false);
    setShowAddModal(true);
  }

  function handleAddSubmit() {
    setShowAddConfirm(true);
  }

  async function confirmAddSubmit() {
    const token = getAdminToken();
    if (!token) return;
    setAddSaving(true);
    const payload: Record<string, unknown> = {
      display_handle: addForm.display_handle.trim() || null,
      trust_level: addForm.trust_level,
    };
    if (addForm.area_id) payload.area_id = addForm.area_id;
    else payload.area_id = null;
    try {
      const res = await fetch("/api/admin/contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d?.message ?? "Add failed", "error");
        return;
      }
      toast("User added", "success");
      setShowAddConfirm(false);
      setShowAddModal(false);
      load();
    } catch {
      toast("Add failed", "error");
    } finally {
      setAddSaving(false);
    }
  }

  function openEditModal(c: Contributor) {
    setEditingContributor(c);
    setEditForm({
      display_handle: c.display_handle ?? "",
      area_id: c.area?.id ?? "",
      trust_level: c.trust_level ?? "new",
    });
    setShowEditConfirm(false);
    setShowEditModal(true);
  }

  function handleEditSubmit() {
    setShowEditConfirm(true);
  }

  async function confirmEditSubmit() {
    if (!editingContributor) return;
    const token = getAdminToken();
    if (!token) return;
    setEditSaving(true);
    const payload: Record<string, unknown> = {
      display_handle: editForm.display_handle.trim() || null,
      trust_level: editForm.trust_level,
    };
    if (editForm.area_id) payload.area_id = editForm.area_id;
    else payload.area_id = null;
    try {
      const res = await fetch(`/api/admin/contributors/${editingContributor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d?.message ?? "Update failed", "error");
        return;
      }
      toast("User updated", "success");
      setShowEditConfirm(false);
      setShowEditModal(false);
      load();
    } catch {
      toast("Update failed", "error");
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmBan() {
    if (!banTarget) return;
    const token = getAdminToken();
    if (!token) return;
    setBanningId(banTarget.id);
    try {
      const res = await fetch(`/api/admin/contributors/${banTarget.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: "Violation", hide_reports: false }),
      });
      if (res.ok) {
        toast("User banned", "success");
        setBanTarget(null);
        setContributors((prev) => prev.map((c) => (c.id === banTarget.id ? { ...c, is_banned: true } : c)));
      } else {
        const d = await res.json();
        toast(d?.message ?? "Ban failed", "error");
      }
    } catch {
      toast("Ban failed", "error");
    } finally {
      setBanningId(null);
    }
  }

  async function confirmUnban() {
    if (!unbanTarget) return;
    const token = getAdminToken();
    if (!token) return;
    setUnbanLoading(true);
    try {
      const res = await fetch(`/api/admin/contributors/${unbanTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_banned: false, ban_reason: null }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d?.message ?? "Unban failed", "error");
        return;
      }
      toast("User unbanned", "success");
      setUnbanTarget(null);
      setContributors((prev) => prev.map((c) => (c.id === unbanTarget.id ? { ...c, is_banned: false } : c)));
    } catch {
      toast("Unban failed", "error");
    } finally {
      setUnbanLoading(false);
    }
  }

  // Soft delete: ban the user instead of hard delete
  async function confirmRemove() {
    if (!removeTarget) return;
    const token = getAdminToken();
    if (!token) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/admin/contributors/${removeTarget.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: "Removed by admin", hide_reports: false }),
      });
      if (res.ok) {
        toast("User removed (banned)", "success");
        setRemoveTarget(null);
        setContributors((prev) => prev.map((c) => (c.id === removeTarget.id ? { ...c, is_banned: true } : c)));
      } else {
        const d = await res.json();
        toast(d?.message ?? "Remove failed", "error");
      }
    } catch {
      toast("Remove failed", "error");
    } finally {
      setRemoveLoading(false);
    }
  }

  // Inline status toggle (ban/unban)
  async function handleStatusChange(c: Contributor, ban: boolean) {
    const token = getAdminToken();
    if (!token) { toast("Login required", "error"); return; }
    setStatusDropdownId(null);
    setLoadingStatusId(c.id);
    try {
      if (ban) {
        const res = await fetch(`/api/admin/contributors/${c.id}/ban`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reason: "Banned by admin", hide_reports: false }),
        });
        if (res.ok) {
          setContributors((prev) => prev.map((x) => x.id === c.id ? { ...x, is_banned: true } : x));
          toast("User banned", "success");
        } else {
          const d = await res.json();
          toast(d?.message ?? "Failed", "error");
        }
      } else {
        const res = await fetch(`/api/admin/contributors/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_banned: false, ban_reason: null }),
        });
        if (res.ok) {
          setContributors((prev) => prev.map((x) => x.id === c.id ? { ...x, is_banned: false } : x));
          toast("User unbanned", "success");
        } else {
          const d = await res.json();
          toast(d?.message ?? "Failed", "error");
        }
      }
    } catch {
      toast("Failed", "error");
    } finally {
      setLoadingStatusId(null);
    }
  }

  // Inline trust level change
  async function handleTrustChange(c: Contributor, newLevel: string) {
    const token = getAdminToken();
    if (!token) { toast("Login required", "error"); return; }
    setTrustDropdownId(null);
    setLoadingTrustId(c.id);
    try {
      const res = await fetch(`/api/admin/contributors/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trust_level: newLevel }),
      });
      if (res.ok) {
        setContributors((prev) => prev.map((x) => x.id === c.id ? { ...x, trust_level: newLevel } : x));
        toast("Trust updated", "success");
      } else {
        const d = await res.json();
        toast(d?.message ?? "Failed", "error");
      }
    } catch {
      toast("Failed", "error");
    } finally {
      setLoadingTrustId(null);
    }
  }

  const trustLabel: Record<string, string> = {
    new: "New",
    regular: "Regular",
    trusted: "Trusted",
    verified: "Verified",
  };

  const trustDot: Record<string, string> = {
    new: "⚪",
    regular: "🔵",
    trusted: "🟢",
    verified: "🟡",
  };

  const trustStyles: Record<string, string> = {
    new: "border-[#64748B35] bg-[#334155] text-[#94A3B8]",
    regular: "border-[#3B82F635] bg-[#3B82F618] text-[#60A5FA]",
    trusted: "border-[#4A7C5935] bg-[#4A7C5920] text-[#6BA880]",
    verified: "border-[#D4913A35] bg-[#D4913A18] text-[#E8B870]",
  };

  const filteredContributors = contributors.filter((c) => {
    // filterHandle is now server-side via the "search" query param
    if (filterArea.trim()) {
      const q = filterArea.trim().toLowerCase();
      if (!(c.area?.name_ar ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterTrust !== "all" && c.trust_level !== filterTrust) return false;
    if (filterStatus === "active" && c.is_banned) return false;
    if (filterStatus === "banned" && !c.is_banned) return false;
    return true;
  });

  function statusBadge(isBanned: boolean) {
    if (isBanned) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#A8585235] bg-[#A8585218] px-2.5 py-0.5 text-[10px] font-semibold text-[#D49088]">
          <span className="text-[8px]">🔴</span> Banned
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#4A7C5935] bg-[#4A7C5920] px-2.5 py-0.5 text-[10px] font-semibold text-[#6BA880]">
        <span className="text-[8px]">🟢</span> Active
      </span>
    );
  }

  function trustBadge(level: string) {
    const style = trustStyles[level] ?? trustStyles.new;
    const dot = trustDot[level] ?? "⚪";
    const label = trustLabel[level] ?? level;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${style}`}>
        <span className="text-[8px]">{dot}</span> {label}
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
          ) : contributors.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No contributors found</div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070] w-12">#</th>
                    {/* Handle — text filter */}
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                      <div className="relative inline-flex items-center gap-1">
                        Handle
                        <button onClick={() => setOpenFilter(openFilter === "handle" ? null : "handle")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterHandle ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                        </button>
                        {openFilter === "handle" && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                            <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl p-2">
                              <input
                                autoFocus
                                type="text"
                                value={filterHandle}
                                onChange={(e) => setFilterHandle(e.target.value)}
                                placeholder="Filter handle..."
                                className="w-full h-[30px] rounded-md border border-[#243040] bg-[#111820] px-2 text-xs text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59] font-normal normal-case tracking-normal"
                              />
                              {filterHandle && (
                                <button onClick={() => { setFilterHandle(""); setOpenFilter(null); }} className="mt-1.5 w-full text-center text-[10px] text-[#4E6070] hover:text-[#D8E4F0]">Clear</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </th>
                    {/* Area — text filter */}
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
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
                    {/* Trust — select filter */}
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                      <div className="relative inline-flex items-center gap-1">
                        Trust
                        <button onClick={() => setOpenFilter(openFilter === "trust" ? null : "trust")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterTrust !== "all" ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                        </button>
                        {openFilter === "trust" && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                            <div className="absolute left-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              {[{ v: "all", l: "All" }, { v: "new", l: "⚪ New" }, { v: "regular", l: "🔵 Regular" }, { v: "trusted", l: "🟢 Trusted" }, { v: "verified", l: "🟡 Verified" }].map((o) => (
                                <button
                                  key={o.v}
                                  onClick={() => { setFilterTrust(o.v); setOpenFilter(null); }}
                                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#243040] flex items-center gap-2 font-normal normal-case tracking-normal ${filterTrust === o.v ? "text-[#4A7C59]" : "text-[#D8E4F0]"}`}
                                >
                                  {o.l}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reports</th>
                    {/* Status — select filter */}
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">
                      <div className="relative inline-flex items-center gap-1">
                        Status
                        <button onClick={() => setOpenFilter(openFilter === "status" ? null : "status")} className={`p-0.5 rounded hover:bg-[#243040] transition-colors ${filterStatus !== "all" ? "text-[#4A7C59]" : "text-[#4E6070]"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                        </button>
                        {openFilter === "status" && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                            <div className="absolute left-0 top-full mt-1 z-30 w-40 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                              {[{ v: "all", l: "All" }, { v: "active", l: "🟢 Active" }, { v: "banned", l: "🔴 Banned" }].map((o) => (
                                <button
                                  key={o.v}
                                  onClick={() => { setFilterStatus(o.v); setOpenFilter(null); }}
                                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#243040] flex items-center gap-2 font-normal normal-case tracking-normal ${filterStatus === o.v ? "text-[#4A7C59]" : "text-[#D8E4F0]"}`}
                                >
                                  {o.l}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-2.5 text-center">
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
                  {filteredContributors.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-sm text-[#4E6070]">No results match filters</td></tr>
                  )}
                  {filteredContributors.map((c, i) => (
                    <tr key={c.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-[10px] font-mono text-[#4E6070]">{offset + i + 1}</td>
                      <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{c.display_handle ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{c.area?.name_ar ?? "—"}</td>
                      {/* Clickable Trust */}
                      <td className="px-5 py-3">
                        <div className="relative">
                          {loadingTrustId === c.id ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#243040] bg-[#18212C] px-2.5 py-0.5 text-[10px] text-[#8FA3B8]">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setTrustDropdownId(trustDropdownId === c.id ? null : c.id)}
                              className="cursor-pointer"
                            >
                              {trustBadge(c.trust_level)}
                            </button>
                          )}
                          {trustDropdownId === c.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setTrustDropdownId(null)} />
                              <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                {TRUST_LEVELS.filter((t) => t !== c.trust_level).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleTrustChange(c, t)}
                                    className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                  >
                                    {trustDot[t]} {trustLabel[t]}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[#D8E4F0]">{c.report_count}</td>
                      {/* Clickable Status */}
                      <td className="px-5 py-3">
                        <div className="relative">
                          {loadingStatusId === c.id ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#243040] bg-[#18212C] px-2.5 py-0.5 text-[10px] text-[#8FA3B8]">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusDropdownId(statusDropdownId === c.id ? null : c.id)}
                              className="cursor-pointer"
                            >
                              {statusBadge(c.is_banned)}
                            </button>
                          )}
                          {statusDropdownId === c.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setStatusDropdownId(null)} />
                              <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                {c.is_banned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(c, false)}
                                    className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                  >
                                    🟢 Active (Unban)
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(c, true)}
                                    className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2"
                                  >
                                    🔴 Ban
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      {/* Kebab menu */}
                      <td className="px-5 py-3 text-center">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === c.id ? null : c.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#243040] bg-[#18212C] text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors cursor-pointer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                          </button>
                          {actionMenuId === c.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-[#243040] bg-[#18212C] shadow-xl py-1">
                                <button onClick={() => { openEditModal(c); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D8E4F0] hover:bg-[#243040] flex items-center gap-2">
                                  ✏️ Edit
                                </button>
                                {c.is_banned ? (
                                  <button onClick={() => { setUnbanTarget(c); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#6BA880] hover:bg-[#243040] flex items-center gap-2">
                                    ✅ Unban
                                  </button>
                                ) : (
                                  <button onClick={() => { setBanTarget(c); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#E8B870] hover:bg-[#243040] flex items-center gap-2">
                                    ⛔ Ban
                                  </button>
                                )}
                                {!c.is_banned && (
                                  <>
                                    <div className="h-px bg-[#243040] my-1" />
                                    <button onClick={() => { setRemoveTarget(c); setActionMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-[#D49088] hover:bg-[#243040] flex items-center gap-2">
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

      {/* Add User modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !showAddConfirm && setShowAddModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Add User</h3>
            {!showAddConfirm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Display Handle</label>
                    <input
                      type="text"
                      value={addForm.display_handle}
                      onChange={(e) => setAddForm((f) => ({ ...f, display_handle: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="Handle"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Area</label>
                    <select
                      value={addForm.area_id}
                      onChange={(e) => setAddForm((f) => ({ ...f, area_id: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">—</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Trust Level</label>
                    <select
                      value={addForm.trust_level}
                      onChange={(e) => setAddForm((f) => ({ ...f, trust_level: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      {TRUST_LEVELS.map((t) => (
                        <option key={t} value={t}>{trustLabel[t] ?? t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]">Cancel</button>
                  <button type="button" onClick={handleAddSubmit} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]">Add User</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">Are you sure you want to add this user?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddConfirm(false)} disabled={addSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Back</button>
                  <button type="button" onClick={confirmAddSubmit} disabled={addSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{addSaving ? "..." : "Yes, Add"}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Edit modal */}
      {showEditModal && editingContributor && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !showEditConfirm && setShowEditModal(false)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-4">Edit User</h3>
            {!showEditConfirm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Display Handle</label>
                    <input
                      type="text"
                      value={editForm.display_handle}
                      onChange={(e) => setEditForm((f) => ({ ...f, display_handle: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                      placeholder="Handle"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Area</label>
                    <select
                      value={editForm.area_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, area_id: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      <option value="">—</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#4E6070] mb-1">Trust Level</label>
                    <select
                      value={editForm.trust_level}
                      onChange={(e) => setEditForm((f) => ({ ...f, trust_level: e.target.value }))}
                      className="w-full rounded-lg border border-[#243040] bg-[#111820] px-3 py-2 text-sm text-[#D8E4F0] outline-none focus:border-[#4A7C59]"
                    >
                      {TRUST_LEVELS.map((t) => (
                        <option key={t} value={t}>{trustLabel[t] ?? t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040]">Cancel</button>
                  <button type="button" onClick={handleEditSubmit} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]">Save Changes</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[#D8E4F0] mb-4">Are you sure you want to save these changes?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowEditConfirm(false)} disabled={editSaving} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Back</button>
                  <button type="button" onClick={confirmEditSubmit} disabled={editSaving} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{editSaving ? "..." : "Yes, Save"}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Ban confirmation */}
      {banTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !banningId && setBanTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Ban User</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to ban &ldquo;{banTarget.display_handle ?? banTarget.id}&rdquo;? They will no longer be able to submit reports.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setBanTarget(null)} disabled={!!banningId} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmBan} disabled={!!banningId} className="flex-1 rounded-lg border border-[#D4913A] bg-[#D4913A18] px-4 py-2 text-sm font-medium text-[#E8B870] hover:bg-[#D4913A28] disabled:opacity-50 transition-colors">{banningId ? "..." : "Yes, Ban"}</button>
            </div>
          </div>
        </>
      )}

      {/* Unban confirmation */}
      {unbanTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !unbanLoading && setUnbanTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Unban User</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to unban &ldquo;{unbanTarget.display_handle ?? unbanTarget.id}&rdquo;? They will be able to submit reports again.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setUnbanTarget(null)} disabled={unbanLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmUnban} disabled={unbanLoading} className="flex-1 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347] disabled:opacity-50">{unbanLoading ? "..." : "Yes, Unban"}</button>
            </div>
          </div>
        </>
      )}

      {/* Remove confirmation (soft delete) */}
      {removeTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !removeLoading && setRemoveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove User</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to remove &ldquo;{removeTarget.display_handle ?? removeTarget.id}&rdquo;? The user will be banned and their status set to inactive.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} disabled={removeLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmRemove} disabled={removeLoading} className="flex-1 rounded-lg border border-[#A85852] bg-[#A8585218] px-4 py-2 text-sm font-medium text-[#D49088] hover:bg-[#A8585228] disabled:opacity-50 transition-colors">{removeLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
