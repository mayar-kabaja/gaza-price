"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/market", label: "السوق", icon: "shop" },
  { href: "/market/my", label: "إعلاناتي", icon: "grid" },
  { href: "/market/saved", label: "المحفوظات", icon: "bookmark" },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  shop: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  ),
  grid: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  bookmark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  ),
};

interface MarketSidebarProps {
  children?: React.ReactNode;
}

export function MarketSidebar({ children }: MarketSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Nav links */}
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/market"
            ? pathname === "/market"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-body transition-colors text-right",
                active
                  ? "bg-olive-pale text-olive font-semibold"
                  : "text-slate hover:bg-fog hover:text-ink"
              )}
            >
              {ICONS[item.icon]}
              <span>{item.label}</span>
              {active && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-olive" />}
            </Link>
          );
        })}
      </div>

      {children && (
        <>
          <div className="border-t border-border/60" />
          {children}
        </>
      )}
    </div>
  );
}
