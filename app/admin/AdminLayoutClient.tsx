"use client";

import { useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAdminToken, clearAdminToken } from "@/lib/auth/token";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminToastProvider } from "@/components/admin/AdminToast";

const ADMIN_LOGIN = "/admin/login";

function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<{ email?: string; id?: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [flagsCount, setFlagsCount] = useState(0);
  const checkIdRef = useRef(0);

  const checkAuth = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return null;
    }
    const id = ++checkIdRef.current;
    try {
      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      // Ignore result if a newer check started (e.g. React Strict Mode double-mount)
      if (id !== checkIdRef.current) return null;
      if (!res.ok) {
        clearAdminToken();
        setAdmin(null);
        setLoading(false);
        return null;
      }
      const data = (await res.json()) as { email?: string; id?: string };
      if (id !== checkIdRef.current) return null;
      setAdmin({ email: data.email ?? "Admin", id: data.id });
      return data;
    } catch {
      if (id !== checkIdRef.current) return null;
      setAdmin(null);
      setLoading(false);
      return null;
    } finally {
      if (id === checkIdRef.current) setLoading(false);
    }
  }, []);

  const [sidebarCounts, setSidebarCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async (token: string) => {
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" as const };
    try {
      const [
        pendingRes,
        flagsRes,
        productsRes,
        sectionsRes,
        categoriesRes,
        areasRes,
        contributorsRes,
        reportsRes,
        logsRes,
        snapshotsRes,
        pendingPlacesRes,
        pendingListingsRes,
      ] = await Promise.all([
        fetch("/api/admin/products/pending?limit=1&offset=0", { headers }),
        fetch("/api/admin/flags?limit=1&offset=0", { headers }),
        fetch("/api/products?limit=1&all=1", { headers: { Accept: "application/json" } }),
        fetch("/api/sections", { headers: { Accept: "application/json" } }),
        fetch("/api/categories", { headers: { Accept: "application/json" } }),
        fetch("/api/areas", { headers: { Accept: "application/json" } }),
        fetch("/api/admin/contributors?limit=1&offset=0", { headers }),
        fetch("/api/reports?limit=1&offset=0", { headers: { Accept: "application/json" } }),
        fetch("/api/admin/logs/search?limit=1&offset=0", { headers }),
        fetch("/api/admin/logs/snapshots?limit=1&offset=0", { headers }),
        fetch("/api/admin/places?status=pending&limit=1&offset=0", { headers }),
        fetch("/api/admin/listings/pending?limit=1&offset=0", { headers }),
      ]);
      const counts: Record<string, number> = {};
      if (pendingRes.ok) {
        const d = (await pendingRes.json()) as { total?: number };
        setPendingCount(d.total ?? 0);
        counts.suggestions = d.total ?? 0;
      }
      if (flagsRes.ok) {
        const d = (await flagsRes.json()) as { total?: number };
        setFlagsCount(d.total ?? 0);
        counts.flags = d.total ?? 0;
      }
      if (productsRes.ok) {
        const d = (await productsRes.json()) as { total?: number };
        counts.products = d.total ?? 0;
      }
      if (sectionsRes.ok) {
        const d = await sectionsRes.json();
        counts.sections = Array.isArray(d) ? d.length : 0;
      }
      if (categoriesRes.ok) {
        const d = await categoriesRes.json();
        counts.categories = Array.isArray(d) ? d.length : 0;
      }
      if (areasRes.ok) {
        const d = (await areasRes.json()) as { areas?: unknown[] };
        counts.areas = d?.areas?.length ?? 0;
      }
      if (contributorsRes.ok) {
        const d = (await contributorsRes.json()) as { total?: number };
        counts.users = d.total ?? 0;
      }
      if (reportsRes.ok) {
        const d = (await reportsRes.json()) as { total?: number };
        counts.reports = d.total ?? 0;
      }
      if (logsRes.ok) {
        const d = (await logsRes.json()) as { total?: number };
        counts.logs = d.total ?? 0;
      }
      if (snapshotsRes.ok) {
        const d = (await snapshotsRes.json()) as { total?: number };
        counts.snapshots = d.total ?? 0;
      }
      if (pendingPlacesRes.ok) {
        const d = (await pendingPlacesRes.json()) as { total?: number };
        counts.pendingPlaces = d.total ?? 0;
      }
      if (pendingListingsRes.ok) {
        const d = (await pendingListingsRes.json()) as { total?: number };
        counts.pendingListings = d.total ?? 0;
      }
      setSidebarCounts(counts);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkAuth().then((a) => {
      if (a) {
        const token = getAdminToken();
        if (token) fetchCounts(token);
      }
    });
  }, [checkAuth, fetchCounts]);

  useEffect(() => {
    const onRefetch = () => {
      const token = getAdminToken();
      if (token) fetchCounts(token);
    };
    window.addEventListener("admin:refetch-counts", onRefetch as EventListener);
    return () => window.removeEventListener("admin:refetch-counts", onRefetch as EventListener);
  }, [fetchCounts]);

  return { admin, loading, pendingCount, flagsCount, sidebarCounts, refetch: checkAuth };
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === ADMIN_LOGIN;
  const { admin, loading, pendingCount, flagsCount, sidebarCounts } = useAdminAuth();

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
    return () => {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isLoginPage && !admin) {
      router.replace(ADMIN_LOGIN);
    }
  }, [loading, admin, isLoginPage, router]);

  if (loading && !isLoginPage) {
    return (
      <div className="admin-root flex h-screen items-center justify-center bg-[#0B0F14]" dir="ltr">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
      </div>
    );
  }

  if (isLoginPage) {
    return (
      <div className="admin-root min-h-screen bg-[#0B0F14] flex items-center justify-center p-4" dir="ltr">
        {children}
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminToastProvider>
      <AdminLayout
        adminName={admin.email ?? "Admin"}
        pendingCount={pendingCount}
        flagsCount={flagsCount}
        sidebarCounts={sidebarCounts}
      >
        {children}
      </AdminLayout>
    </AdminToastProvider>
  );
}
