"use client";

import { createContext, useContext, useState, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSession } from "@/hooks/useSession";
import { useArea } from "@/hooks/useArea";
import { TickerStrip } from "@/components/layout/TickerStrip";

const DesktopHeader = dynamic(
  () => import("@/components/desktop/DesktopHeader").then(m => ({ default: m.DesktopHeader })),
  { ssr: false }
);
const DesktopSubmitModal = dynamic(
  () => import("@/components/desktop/DesktopSubmitModal").then(m => ({ default: m.DesktopSubmitModal })),
  { ssr: false }
);
const DesktopSuggestModal = dynamic(
  () => import("@/components/desktop/DesktopSuggestModal").then(m => ({ default: m.DesktopSuggestModal })),
  { ssr: false }
);
const DesktopNewListingModal = dynamic(
  () => import("@/components/desktop/DesktopNewListingModal").then(m => ({ default: m.DesktopNewListingModal })),
  { ssr: false }
);
const DesktopAddChooser = dynamic(
  () => import("@/components/desktop/DesktopAddChooser").then(m => ({ default: m.DesktopAddChooser })),
  { ssr: false }
);

// ── Global sidebar store (external store pattern — avoids React update cycles) ──
let _sidebarSnapshot: { content: React.ReactNode } = { content: null };
const _sidebarListeners = new Set<() => void>();

function _sidebarSubscribe(cb: () => void) {
  _sidebarListeners.add(cb);
  return () => _sidebarListeners.delete(cb);
}
function _getSidebarSnapshot() { return _sidebarSnapshot; }
function _getServerSnapshot() { return _sidebarSnapshot; }

export function setGlobalSidebarContent(content: React.ReactNode) {
  // Skip if the exact same content reference — prevents unnecessary SidebarSlot re-renders
  if (_sidebarSnapshot.content === content) return;
  _sidebarSnapshot = { content };
  _sidebarListeners.forEach(l => l());
}

// Hook that pages call to inject their sidebar content
export function useGlobalSidebar(content: React.ReactNode) {
  const ref = useRef(content);
  ref.current = content;
  useLayoutEffect(() => {
    setGlobalSidebarContent(ref.current);
  });
}

function SidebarSlot() {
  const { content } = useSyncExternalStore(_sidebarSubscribe, _getSidebarSnapshot, _getServerSnapshot);
  return <>{content}</>;
}

// ── Global modal/action context ──
interface GlobalCtx {
  openSubmitModal: () => void;
  openSuggestModal: () => void;
  openNewListingModal: () => void;
}

const GlobalContext = createContext<GlobalCtx>({
  openSubmitModal: () => {},
  openSuggestModal: () => {},
  openNewListingModal: () => {},
});

export function useGlobalContext() {
  return useContext(GlobalContext);
}

// ── Nav links ──
const NAV_LINKS = [
  {
    href: "/",
    label: "الرئيسية",
    subtitle: "جميع المنتجات والأسعار",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: "/places",
    label: "محلات",
    subtitle: "استكشف المحلات في منطقتك",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/market",
    label: "السوق",
    subtitle: "تسوق من المحلات مباشرة",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    href: "/market/chat",
    label: "رسائل",
    subtitle: "محادثاتك مع البائعين",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
];

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
if (href === "/market/chat") return pathname.startsWith("/market/chat");
  if (href === "/market") return pathname === "/market" || (pathname.startsWith("/market/") && !pathname.startsWith("/market/chat"));
  return pathname.startsWith(href);
}

function DesktopFooter() {
  return (
    <div className="py-10 text-center" dir="rtl">
      <div className="text-[14px] font-display font-bold text-mist mb-1">ساهم في شفافية الاسعار في غزة</div>
      <div className="text-[12px] text-mist/60">كل سعر تبلغ عنه بيساعد جيرانك يلاقوا ارخص الاسعار</div>
    </div>
  );
}

export function GlobalDesktopShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const { contributor } = useSession();
  const { area } = useArea();
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [newListingOpen, setNewListingOpen] = useState(false);

  const skipShell = pathname.startsWith("/admin") || pathname.startsWith("/places/dashboard") || pathname.match(/^\/places\/[^/]+\/menu$/);

  if (skipShell) return <>{children}</>;

  const ctxValue = {
    openSubmitModal: () => setSubmitOpen(true),
    openSuggestModal: () => setSuggestOpen(true),
    openNewListingModal: () => setNewListingOpen(true),
  };

  // Wait for isDesktop to resolve before rendering anything — prevents mobile→desktop flash
  if (isDesktop === null) {
    return (
      <GlobalContext.Provider value={ctxValue}>
        <div className="h-screen bg-fog" dir="rtl" />
      </GlobalContext.Provider>
    );
  }

  return (
    <GlobalContext.Provider value={ctxValue}>
      <div className={isDesktop ? "h-screen flex flex-col" : "contents"} dir="rtl">
        {isDesktop && (
          <>
            <DesktopHeader
              onAddClick={() => setAddChooserOpen(true)}
              onSubmitClick={() => setSubmitOpen(true)}
              onSuggestClick={() => setSuggestOpen(true)}
              onNewListingClick={() => setNewListingOpen(true)}
              onProfileClick={() => { window.location.href = "/account"; }}
              isProfileActive={false}
            />
            <TickerStrip />
          </>
        )}

        {/* Sidebar + main wrapper — takes remaining height, scrolls together */}
        <div className={isDesktop ? "flex-1 flex overflow-hidden bg-fog" : "contents"}>

            {/* Icon nav sidebar — right side in RTL (first in flex), sticky */}
            {isDesktop && (
              <nav className="w-[82px] flex-shrink-0 bg-surface border-l border-border/40 flex flex-col items-center py-4 gap-1">
                {NAV_LINKS.map(({ href, label, icon }, idx) => {
                  const active = isLinkActive(href, pathname);
                  const iconStyles = [
                    { bg: "bg-olive-pale", activeBg: "bg-olive-pale", text: "text-olive" },
                    { bg: "bg-amber-50", activeBg: "bg-amber-50", text: "text-amber-600" },
                    { bg: "bg-emerald-50", activeBg: "bg-emerald-50", text: "text-emerald-600" },
                    { bg: "bg-blue-50", activeBg: "bg-blue-50", text: "text-blue-500" },
                    { bg: "bg-purple-50", activeBg: "bg-purple-50", text: "text-purple-500" },
                  ];
                  const style = iconStyles[idx % iconStyles.length];
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors w-full ${active ? "bg-fog" : "hover:bg-fog"}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? style.activeBg : style.bg}`}>
                        <span className={`${style.text} [&_svg]:w-[18px] [&_svg]:h-[18px]`}>{icon}</span>
                      </div>
                      <span className={`text-[11px] leading-tight ${active ? "font-bold text-ink" : "text-mist"}`}>{label}</span>
                    </Link>
                  );
                })}

                {/* Avatar at bottom */}
                <div className="mt-auto">
                  <Link href="/account" className="flex flex-col items-center gap-1 py-2">
                    <div className="w-10 h-10 rounded-full bg-olive flex items-center justify-center text-white text-base font-display font-bold">
                      {contributor?.display_handle?.trim()?.slice(0, 1)?.toUpperCase() || "م"}
                    </div>
                  </Link>
                </div>
              </nav>
            )}

            {/* Categories / filters sidebar */}
            {isDesktop && (
              <aside className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden bg-surface border-l border-border/40 py-4 px-3 gap-4">
                {/* Section title */}
                <p className="text-[15px] font-display font-bold text-ink pr-1">الأقسام</p>

                {/* Categories list */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  <SidebarSlot />
                </div>

                {/* Promo card */}
                <div className="bg-olive-pale rounded-xl border border-olive-mid/30 px-3 py-2.5 flex items-center gap-3 flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-display font-bold text-olive-deep">عندك محل؟</div>
                    <div className="text-[11px] text-olive leading-snug">انضم للتجار وزد مبيعاتك</div>
                  </div>
                  <Link
                    href="/places/register"
                    className="bg-olive text-white px-3 py-1.5 rounded-lg text-[11px] font-display font-bold hover:bg-olive-deep transition-colors flex-shrink-0"
                  >
                    سجل محلك
                  </Link>
                </div>
              </aside>
            )}

            {/* Main content + footer — scrolls together */}
            <div className={isDesktop ? "flex-1 overflow-y-auto min-w-0 flex flex-col" : "contents"}>
              <main className={isDesktop ? "flex-1 bg-fog relative" : "contents"}>
                {children}
              </main>
              {isDesktop && pathname === "/" && <DesktopFooter />}
            </div>

        </div>

        {isDesktop && (
          <>
            <DesktopAddChooser
              open={addChooserOpen}
              onClose={() => setAddChooserOpen(false)}
              onSubmit={() => setSubmitOpen(true)}
              onSuggest={() => setSuggestOpen(true)}
              onListing={() => setNewListingOpen(true)}
            />
            <DesktopSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
            <DesktopSuggestModal open={suggestOpen} onClose={() => setSuggestOpen(false)} />
            <DesktopNewListingModal open={newListingOpen} onClose={() => setNewListingOpen(false)} />
          </>
        )}
      </div>
    </GlobalContext.Provider>
  );
}
