"use client";

import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/token";
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

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<Contributor | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(FORM_EMPTY);
  const [addSaving, setAddSaving] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const limit = 20;

  function load() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
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
    load();
  }, [offset]);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d?.areas ?? []))
      .catch(() => setAreas([]));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    load();
  }

  function openAddModal() {
    setAddForm(FORM_EMPTY);
    setShowAddConfirm(false);
    setShowAddModal(true);
  }

  function handleAddSubmit() {
    setShowAddConfirm(true);
  }

  async function confirmAddSubmit() {
    const token = getStoredToken();
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
    const token = getStoredToken();
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
    const token = getStoredToken();
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
    const token = getStoredToken();
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

  async function confirmRemove() {
    if (!removeTarget) return;
    const token = getStoredToken();
    if (!token) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/admin/contributors/${removeTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d?.message ?? "Remove failed", "error");
        return;
      }
      toast("User removed", "success");
      setRemoveTarget(null);
      setContributors((prev) => prev.filter((c) => c.id !== removeTarget.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      toast("Remove failed", "error");
    } finally {
      setRemoveLoading(false);
    }
  }

  const trustLabel: Record<string, string> = {
    new: "New",
    regular: "Regular",
    trusted: "Trusted",
    verified: "Verified",
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by handle..."
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
            >
              Search
            </button>
          </form>
          <button
            onClick={openAddModal}
            className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
          >
            + Add User
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : contributors.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">No contributors found</div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Handle</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Area</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Trust</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Reports</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Status</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((c) => (
                    <tr key={c.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{c.display_handle ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{c.area?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full border border-[#4A7C5935] bg-[#4A7C5920] px-2 py-0.5 text-[10px] text-[#6BA880]">
                          {trustLabel[c.trust_level] ?? c.trust_level}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[#D8E4F0]">{c.report_count}</td>
                      <td className="px-5 py-3">
                        {c.is_banned ? (
                          <span className="text-[10px] font-medium text-[#E05A4E]">Banned</span>
                        ) : (
                          <span className="text-[10px] text-[#6BA880]">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => openEditModal(c)}
                            className="text-[11px] text-[#8FA3B8] hover:text-[#D8E4F0] hover:underline"
                          >
                            Edit
                          </button>
                          {c.is_banned ? (
                            <button
                              onClick={() => setUnbanTarget(c)}
                              className="text-[11px] text-[#6BA880] hover:text-[#8FD9A0] hover:underline"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanTarget(c)}
                              disabled={banningId === c.id}
                              className="rounded border border-[#E05A4E50] bg-[#E05A4E25] px-2 py-1 text-[11px] text-[#E05A4E] hover:bg-[#E05A4E35] disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            onClick={() => setRemoveTarget(c)}
                            className="text-[11px] text-[#E05A4E] hover:underline"
                          >
                            Remove
                          </button>
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
              <button type="button" onClick={confirmBan} disabled={!!banningId} className="flex-1 rounded-lg bg-[#E05A4E] px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{banningId ? "..." : "Yes, Ban"}</button>
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

      {/* Remove confirmation */}
      {removeTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => !removeLoading && setRemoveTarget(null)} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-xl border border-[#243040] bg-[#18212C] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#D8E4F0] mb-2">Remove User</h3>
            <p className="text-sm text-[#8FA3B8] mb-4">
              Are you sure you want to remove &ldquo;{removeTarget.display_handle ?? removeTarget.id}&rdquo;? This will permanently delete the user and all their reports. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} disabled={removeLoading} className="flex-1 rounded-lg border border-[#243040] px-4 py-2 text-sm text-[#D8E4F0] hover:bg-[#243040] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmRemove} disabled={removeLoading} className="flex-1 rounded-lg bg-[#E05A4E] px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{removeLoading ? "..." : "Yes, Remove"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
