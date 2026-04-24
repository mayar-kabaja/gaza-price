"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type SubmitType = "price" | "product";

interface TypeGridProps {
  selected: SubmitType;
  onSelect: (type: SubmitType) => void;
}

const TYPES = [
  {
    key: "price" as const,
    label: "سعر منتج",
    desc: "شفت سعر في محل؟ بلّغ عنه وساعد الناس",
    iconBg: "bg-olive-pale",
    iconColor: "#1E4D2B",
    activeBorder: "border-olive",
    activeBg: "bg-olive-pale",
    icon: (color: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    key: "product" as const,
    label: "منتج جديد",
    desc: "منتج مش موجود بالقائمة؟ اقترحه وأضف أول سعر",
    iconBg: "bg-amber-50",
    iconColor: "#F59E0B",
    activeBorder: "border-olive",
    activeBg: "bg-olive-pale",
    icon: (color: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    key: "listing" as const,
    label: "إعلان في السوق",
    desc: "عندك شي للبيع؟ انشر إعلان مجاني للجميع",
    iconBg: "bg-blue-50",
    iconColor: "#3B82F6",
    activeBorder: "border-olive",
    activeBg: "bg-olive-pale",
    icon: (color: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    key: "place" as const,
    label: "مكان جديد",
    desc: "عندك محل أو مطعم أو كافيه؟ سجّله ليظهر للكل",
    iconBg: "bg-purple-50",
    iconColor: "#8B5CF6",
    activeBorder: "border-olive",
    activeBg: "bg-olive-pale",
    icon: (color: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

export function TypeGrid({ selected, onSelect }: TypeGridProps) {
  const router = useRouter();

  return (
    <div className="space-y-2.5">
      {TYPES.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              if (t.key === "listing") {
                router.push("/market/new");
              } else if (t.key === "place") {
                router.push("/places/register");
              } else {
                onSelect(t.key);
              }
            }}
            className={cn(
              "w-full rounded-2xl px-4 py-4 flex items-center gap-3 transition-all duration-150 active:scale-[0.98]",
              active
                ? "border-2 border-olive bg-olive-pale"
                : "border-[1.5px] border-border bg-surface"
            )}
          >
            {/* Icon */}
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", t.iconBg)}>
              {t.icon(t.iconColor)}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 text-right">
              <div className={cn("font-display font-black text-[15px]", active ? "text-olive-deep" : "text-ink")}>
                {t.label}
              </div>
              <div className="text-[12px] text-mist mt-0.5">{t.desc}</div>
            </div>

            {/* Arrow */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              active ? "bg-olive" : "bg-fog"
            )}>
              <svg viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#94A3B8"} strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}
