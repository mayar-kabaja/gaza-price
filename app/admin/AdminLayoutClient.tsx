"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/auth/token";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminToastProvider } from "@/components/admin/AdminToast";

const ADMIN_LOGIN = "/admin/login";

function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<{ email?: string; id?: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [flagsCount, setFlagsCount] = useState(0);

  const checkAuth = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) {
        clearStoredToken();
        setAdmin(null);
        setLoading(false);
        return null;
      }
      const data = (await res.json()) as { email?: string; id?: string };
      setAdmin({ email: data.email ?? "Admin", id: data.id });
      return data;
    } catch {
      setAdmin(null);
      setLoading(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCounts = useCallback(async (token: string) => {
    try {
      const [pendingRes, flagsRes] = await Promise.all([
        fetch("/api/admin/products/pending?limit=1&offset=0", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/flags?limit=1&offset=0", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (pendingRes.ok) {
        const d = (await pendingRes.json()) as { total?: number };
        setPendingCount(d.total ?? 0);
      }
      if (flagsRes.ok) {
        const d = (await flagsRes.json()) as { total?: number };
        setFlagsCount(d.total ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkAuth().then((a) => {
      if (a) {
        const token = getStoredToken();
        if (token) fetchCounts(token);
      }
    });
  }, [checkAuth, fetchCounts]);

  return { admin, loading, pendingCount, flagsCount, refetch: checkAuth };
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === ADMIN_LOGIN;
  const { admin, loading, pendingCount, flagsCount } = useAdminAuth();

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
      >
        {children}
      </AdminLayout>
    </AdminToastProvider>
  );
}
