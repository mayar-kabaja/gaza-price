"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",        icon: "🏠", label: "الرئيسية" },
  { href: "/submit",  icon: "➕", label: "إضافة" },
  { href: "/product", icon: "📊", label: "تقارير" },
  { href: "/account", icon: "👤", label: "حسابي" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-[430px] mx-auto bg-white border-t border-border flex z-40">
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 pb-3 transition-colors",
              active ? "text-olive" : "text-mist"
            )}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className={cn("text-[10px] font-body", active && "font-semibold")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
