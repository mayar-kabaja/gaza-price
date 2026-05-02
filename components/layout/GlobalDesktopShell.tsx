"use client";

import { createContext, useContext, useState, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useIsDesktop } from "@/hooks/useIsDesktop";
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
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: "/market",
    label: "السوق",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    href: "/places",
    label: "محلات",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/market/chat",
    label: "رسائل",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
] as const;

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/market/chat") return pathname.startsWith("/market/chat");
  if (href === "/market") return pathname === "/market" || (pathname.startsWith("/market/") && !pathname.startsWith("/market/chat"));
  return pathname.startsWith(href);
}

export function GlobalDesktopShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [newListingOpen, setNewListingOpen] = useState(false);

  const skipShell = pathname.startsWith("/admin") || pathname.startsWith("/places/dashboard");

  if (skipShell) return <>{children}</>;

  return (
    <GlobalContext.Provider value={{
      openSubmitModal: () => setSubmitOpen(true),
      openSuggestModal: () => setSuggestOpen(true),
      openNewListingModal: () => setNewListingOpen(true),
    }}>
      <div className={isDesktop ? "h-screen grid grid-rows-[60px_34px_1fr]" : "contents"} dir="rtl">
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

        <div className={isDesktop ? "flex overflow-hidden bg-fog" : "contents"}>
          <div className={isDesktop ? "max-w-[960px] w-full mx-auto flex min-h-full" : "contents"}>

            {isDesktop && (
              <aside className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden">
                <div className="flex flex-col overflow-hidden bg-surface rounded-2xl shadow-sm border border-border/60 mt-4 mr-3 mb-3 flex-1">
                  <div className="flex-shrink-0 p-3 space-y-0.5">
                    {NAV_LINKS.map(({ href, label, icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body transition-colors ${
                          isLinkActive(href, pathname)
                            ? "bg-olive text-white font-semibold"
                            : "text-slate hover:bg-fog hover:text-ink"
                        }`}
                      >
                        {icon}{label}
                      </Link>
                    ))}
                  </div>
                  <div className="mx-3 border-t border-border/80 flex-shrink-0" />
                  <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                    <SidebarSlot />
                  </div>
                </div>
              </aside>
            )}

            {/* Main content — always at this tree position so children never remount */}
            <main className={isDesktop ? "flex-1 overflow-y-auto bg-fog min-w-0 relative" : "contents"}>
              {children}
            </main>

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
