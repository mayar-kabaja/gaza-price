"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: "home", label: "الرئيسية" },
  { href: "/categories", icon: "categories", label: "التصنيفات" },
  { href: "/submit", icon: "add", label: "إضافة" },
  { href: "/places", icon: "places", label: "محلات" },
  { href: "/account", icon: "account", label: "حسابي" },
] as const;

function NavIcon({ icon, active, className }: { icon: string; active: boolean; className?: string }) {
  const base = "w-5 h-5 shrink-0 transition-colors";
  const stroke = active ? 2.2 : 1.8;
  const cls = cn(base, className);

  switch (icon) {
    case "home":
      return (
        <svg fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={cls}>
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "categories":
      return (
        <svg fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={cls}>
          <rect x={3} y={3} width={7} height={7} rx={1.5} />
          <rect x={14} y={3} width={7} height={7} rx={1.5} />
          <rect x={3} y={14} width={7} height={7} rx={1.5} />
          <rect x={14} y={14} width={7} height={7} rx={1.5} />
        </svg>
      );
    case "add":
      return (
        <svg fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={cls}>
          <circle cx={12} cy={12} r={10} />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "reports":
      return (
        <svg fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={cls}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case "places":
      return (
        <svg fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={cls}>
          <path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 4v14" />
          <path d="M9 9h1M9 13h1M15 9h1M15 13h1" />
        </svg>
      );
    case "account":
      return (
        <svg fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={cls}>
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 w-full bg-surface border-t border-border flex z-40" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="w-full max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 pt-3 pb-4 min-w-0 transition-colors",
                active ? "text-olive" : "text-mist"
              )}
            >
              <NavIcon icon={icon} active={active} />
              <span className={cn("text-[10px] font-body truncate w-full text-center px-0.5", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
