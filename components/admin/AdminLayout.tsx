"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { clearStoredToken } from "@/lib/auth/token";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/suggestions": "Suggestions",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/areas-stores": "Areas & Stores",
  "/admin/users": "Users",
  "/admin/flags": "Flags",
  "/admin/reports": "Reports",
  "/admin/logs": "Logs",
};

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/admin/suggestions", label: "Suggestions", icon: "clipboard", badge: "pending" },
  { href: "/admin/products", label: "Products", icon: "package" },
  { href: "/admin/categories", label: "Categories", icon: "tag" },
  { href: "/admin/areas-stores", label: "Areas & Stores", icon: "map" },
  { href: "/admin/users", label: "Users", icon: "users", badge: "sand" },
  { href: "/admin/flags", label: "Flags", icon: "bell", badge: "red" },
  { href: "/admin/reports", label: "Reports", icon: "message" },
  { href: "/admin/logs", label: "Logs", icon: "file" },
] as const;

const iconMap: Record<string, ReactNode> = {
  grid: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <rect x={3} y={3} width={7} height={7} rx={1.5} />
      <rect x={14} y={3} width={7} height={7} rx={1.5} />
      <rect x={3} y={14} width={7} height={7} rx={1.5} />
      <rect x={14} y={14} width={7} height={7} rx={1.5} />
    </svg>
  ),
  clipboard: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  package: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  ),
  tag: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  map: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  users: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  bell: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  message: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" />
    </svg>
  ),
  file: (
    <svg fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <rect x={2} y={3} width={20} height={14} rx={2} />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  menu: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

const AdminHeaderContext = createContext<{ setRight: (node: ReactNode) => void } | null>(null);
export function useAdminHeader() {
  const ctx = useContext(AdminHeaderContext);
  return ctx ?? { setRight: () => {} };
}

type AdminLayoutProps = {
  children: ReactNode;
  adminName?: string;
  pendingCount?: number;
  flagsCount?: number;
};

function NavLink({
  href,
  label,
  icon,
  badge,
  badgeCount,
  pathname,
  badgeType = "olive",
}: {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  badgeCount?: number;
  pathname: string;
  badgeType?: "olive" | "sand" | "red";
}) {
  const active = pathname === href;
  const base =
    "flex items-center gap-2.5 py-2 px-2.5 rounded-md text-[13px] mb-0.5 transition-colors";
  const activeCls = "bg-[#4A7C5920] text-[#6BA880] border border-[#4A7C5930]";
  const inactiveCls = "text-[#8FA3B8] hover:bg-[#18212C] hover:text-[#D8E4F0]";
  const badgeCls =
    badgeType === "red"
      ? "bg-[#E05A4E] text-white"
      : badgeType === "sand"
        ? "bg-[#C9A96E] text-[#1a1a1a]"
        : "bg-[#4A7C59] text-white";

  return (
    <Link
      href={href}
      className={`${base} ${active ? activeCls : inactiveCls}`}
    >
      {iconMap[icon]}
      <span>{label}</span>
      {badge === "pending" && badgeCount !== undefined && badgeCount > 0 && (
        <span className={`ml-auto ${badgeCls} text-[10px] font-semibold px-1.5 py-0.5 rounded-full`}>
          {badgeCount}
        </span>
      )}
      {badge === "red" && badgeCount !== undefined && badgeCount > 0 && (
        <span className={`ml-auto ${badgeCls} text-[10px] font-semibold px-1.5 py-0.5 rounded-full`}>
          {badgeCount}
        </span>
      )}
      {badge === "sand" && (
        <span className="ml-auto bg-[#C9A96E] text-[#1a1a1a] text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
          1.2k
        </span>
      )}
    </Link>
  );
}

export function AdminLayout({ children, adminName = "Admin", pendingCount = 0, flagsCount = 0 }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerRight, setHeaderRight] = useState<ReactNode>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 640);
      setIsTablet(w > 640 && w <= 1024);
      if (w > 640) setDrawerOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (drawerOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, isMobile]);

  function handleLogout() {
    clearStoredToken();
    router.replace("/admin/login");
  }

  const pageTitle = PAGE_TITLES[pathname] ?? "Admin";

  const sidebarContent = (
    <>
      <div className="p-[22px] pb-[18px] border-b border-[#243040] flex items-center gap-2.5 sm:p-3 sm:pb-3">
        <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#4A7C59] to-[#6BA880] flex items-center justify-center text-base shrink-0">
          🌿
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold text-[#D8E4F0] tracking-wide">GazaPrice</span>
          <span className="text-[10px] text-[#8FA3B8] tracking-widest">غزةبريس · Admin</span>
        </div>
      </div>

      <nav className="p-5 pt-2 pb-2 sm:p-2 sm:pt-1 sm:pb-1">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-[#4E6070] px-2 mb-1.5">Overview</div>
        <NavLink href="/admin/dashboard" label="Dashboard" icon="grid" pathname={pathname} />
      </nav>

      <nav className="p-5 pt-2 pb-2 sm:p-2 sm:pt-1 sm:pb-1">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-[#4E6070] px-2 mb-1.5">Content</div>
        <NavLink href="/admin/suggestions" label="Suggestions" icon="clipboard" badge="pending" badgeCount={pendingCount} pathname={pathname} />
        <NavLink href="/admin/products" label="Products" icon="package" pathname={pathname} />
        <NavLink href="/admin/categories" label="Categories" icon="tag" pathname={pathname} />
        <NavLink href="/admin/areas-stores" label="Areas & Stores" icon="map" pathname={pathname} />
      </nav>

      <nav className="p-5 pt-2 pb-2 sm:p-2 sm:pt-1 sm:pb-1">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-[#4E6070] px-2 mb-1.5">Community</div>
        <NavLink href="/admin/users" label="Users" icon="users" badge="sand" pathname={pathname} />
        <NavLink href="/admin/flags" label="Flags" icon="bell" badge="red" badgeCount={flagsCount} pathname={pathname} />
        <NavLink href="/admin/reports" label="Reports" icon="message" pathname={pathname} />
      </nav>

      <nav className="p-5 pt-2 pb-2 sm:p-2 sm:pt-1 sm:pb-1">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-[#4E6070] px-2 mb-1.5">System</div>
        <NavLink href="/admin/logs" label="Logs" icon="file" pathname={pathname} />
      </nav>

      <div className="mt-auto p-3 border-t border-[#243040]">
        <div className="flex items-center gap-2.5 p-2.5 bg-[#18212C] rounded-lg">
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#C9A96E] to-[#D4913A] flex items-center justify-center text-xs font-semibold text-[#1a1a1a] shrink-0">
            {adminName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#D8E4F0]">{adminName}</div>
            <div className="text-[10px] text-[#4E6070]">Super Admin</div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded px-2 py-1 text-[10px] font-medium text-[#8FA3B8] hover:bg-[#243040] hover:text-[#D8E4F0] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <AdminHeaderContext.Provider value={{ setRight: setHeaderRight }}>
      <div
        className={`admin-root flex bg-[#0B0F14] text-[#D8E4F0] min-h-screen ${
          isMobile ? "flex-col overflow-auto" : "h-screen overflow-hidden"
        }`}
        dir="ltr"
      >
        {/* Drawer overlay - mobile only */}
        {isMobile && (
          <div
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-[280ms] ease-out ${
              drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - drawer on mobile, rail on tablet, full on desktop */}
        <aside
          className={`admin-sidebar flex flex-col shrink-0 overflow-y-auto transition-[transform,width] duration-[280ms] ease-out
            max-sm:fixed max-sm:top-0 max-sm:left-0 max-sm:z-50 max-sm:h-screen max-sm:w-[260px] max-sm:border-r max-sm:border-[#243040]
            sm:w-[200px] lg:w-[240px]
            ${isMobile && !drawerOpen ? "-translate-x-full" : ""}`}
        >
          {sidebarContent}
        </aside>

        {/* Main area */}
        <div className={`flex-1 flex flex-col min-h-0 ${isMobile ? "min-h-screen" : ""}`}>
          {/* Topbar */}
          <header
            className={`flex flex-shrink-0 items-center border-b border-[#243040] bg-[#111820] gap-4 px-4 sm:px-6
              max-sm:h-[52px] sm:h-[58px]
              max-sm:sticky max-sm:top-0 max-sm:z-30`}
          >
            {/* Hamburger - mobile only */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="max-sm:flex hidden p-2 -ml-2 rounded-lg text-[#D8E4F0] hover:bg-[#18212C]"
              aria-label="Open menu"
            >
              {iconMap.menu}
            </button>

            {/* Page title - center on mobile, left on desktop */}
            <div className="flex-1 min-w-0 flex items-center max-sm:justify-center sm:justify-start">
              <span className="text-[15px] font-semibold text-[#D8E4F0] truncate">{pageTitle}</span>
              <span className="ml-1.5 text-xs text-[#4E6070] hidden sm:inline">/ Overview</span>
            </div>

            {/* Right side: desktop = headerRight (search, status), mobile = notification + avatar */}
            <div className="hidden sm:flex sm:items-center sm:gap-2.5 sm:ml-auto">
              {headerRight}
            </div>
            <div className="flex sm:hidden items-center gap-2">
              <button type="button" className="p-2 rounded-lg text-[#8FA3B8] hover:bg-[#18212C]" aria-label="Notifications">
                {iconMap.bell}
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#D4913A] flex items-center justify-center text-[10px] font-semibold text-[#1a1a1a]">
                {adminName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Content - scrollable - pb for bottom nav on mobile */}
          <div className="flex-1 flex flex-col overflow-y-auto max-sm:overflow-x-hidden max-sm:px-4 max-sm:pt-4 max-sm:pb-[76px] sm:p-6 admin-content-area">
            {children}
          </div>
        </div>

        {/* Bottom nav - mobile only */}
        <nav
          className="max-sm:flex hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] items-center justify-around border-t border-[#243040] bg-[#111820]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <Link
            href="/admin/dashboard"
            className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 ${
              pathname === "/admin/dashboard" ? "text-[#6BA880]" : "text-[#4E6070]"
            }`}
          >
            {iconMap.grid}
            <span className="text-[9px]">Dashboard</span>
          </Link>
          <Link
            href="/admin/suggestions"
            className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 relative ${
              pathname === "/admin/suggestions" ? "text-[#6BA880]" : "text-[#4E6070]"
            }`}
          >
            <span className="relative">
              {iconMap.clipboard}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#E05A4E] px-1 text-[9px] font-bold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </span>
            <span className="text-[9px]">Suggestions</span>
          </Link>
          <Link
            href="/admin/flags"
            className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 ${
              pathname === "/admin/flags" ? "text-[#6BA880]" : "text-[#4E6070]"
            }`}
          >
            {iconMap.bell}
            <span className="text-[9px]">Flags</span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 ${
              drawerOpen ? "text-[#6BA880]" : "text-[#4E6070]"
            }`}
          >
            {iconMap.menu}
            <span className="text-[9px]">More</span>
          </button>
        </nav>
      </div>
    </AdminHeaderContext.Provider>
  );
}
