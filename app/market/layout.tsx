"use client";

import { createContext, useContext, useState, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useIsDesktop } from "@/hooks/useIsDesktop";

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

// ── External store for sidebar slot (avoids React update cycles) ──
let _sidebarSnapshot: { content: React.ReactNode } = { content: null };
const _sidebarListeners = new Set<() => void>();

function _sidebarSubscribe(cb: () => void) {
  _sidebarListeners.add(cb);
  return () => _sidebarListeners.delete(cb);
}
function _getSidebarSnapshot() { return _sidebarSnapshot; }
function _getServerSnapshot() { return _sidebarSnapshot; }

export function setSidebarContent(content: React.ReactNode) {
  _sidebarSnapshot = { content };
  _sidebarListeners.forEach(l => l());
}

// Hook pages use to register their sidebar content
export function useMarketSidebar(content: React.ReactNode) {
  const ref = useRef(content);
  ref.current = content;
  useLayoutEffect(() => {
    setSidebarContent(ref.current);
  }); // runs after every render to stay in sync with filter state changes
}

// Isolated slot component — only this re-renders when sidebar content changes
function SidebarSlot() {
  const { content } = useSyncExternalStore(_sidebarSubscribe, _getSidebarSnapshot, _getServerSnapshot);
  return <>{content}</>;
}

// ── Market Context (for modal handlers) ──
interface MarketCtx {
  openSubmitModal: () => void;
  openSuggestModal: () => void;
  openNewListingModal: () => void;
}
const MarketContext = createContext<MarketCtx>({
  openSubmitModal: () => {},
  openSuggestModal: () => {},
  openNewListingModal: () => {},
});
export function useMarketContext() { return useContext(MarketContext); }

// ── Nav helpers ──
const NAV_LINKS = [
  {
    href: "/market",
    label: "السوق",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/market/chat",
    label: "رسائل",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
];

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/market/chat") return pathname.startsWith("/market/chat");
  if (href === "/market") return pathname === "/market" || (pathname.startsWith("/market/") && !pathname.startsWith("/market/chat"));
  return pathname.startsWith(href);
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [newListingOpen, setNewListingOpen] = useState(false);

  if (!isDesktop) return <>{children}</>;

  return (
    <MarketContext.Provider value={{
      openSubmitModal: () => setSubmitOpen(true),
      openSuggestModal: () => setSuggestOpen(true),
      openNewListingModal: () => setNewListingOpen(true),
    }}>
      <div className="h-screen grid grid-rows-[60px_1fr]" dir="rtl">
        <DesktopHeader
          onSubmitClick={() => setSubmitOpen(true)}
          onSuggestClick={() => setSuggestOpen(true)}
          onNewListingClick={() => setNewListingOpen(true)}
          onProfileClick={() => { window.location.href = "/account"; }}
          isProfileActive={false}
        />

        <div className="flex overflow-hidden bg-fog">
          <div className="max-w-[900px] w-full mx-auto flex min-h-full">

            {/* ONE unified sidebar */}
            <aside className="w-[240px] flex-shrink-0 bg-surface border-l border-border flex flex-col overflow-hidden">
              {/* Fixed nav — never scrolls */}
              <div className="flex-shrink-0 p-3 space-y-0.5">
                {NAV_LINKS.map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body transition-colors ${
                      isLinkActive(href, pathname)
                        ? "bg-olive-pale text-olive font-semibold"
                        : "text-slate hover:bg-fog hover:text-ink"
                    }`}
                  >
                    {icon}{label}
                  </Link>
                ))}
              </div>
              <div className="h-px bg-border flex-shrink-0" />
              {/* Scrollable page-specific content injected by pages */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                <SidebarSlot />
              </div>
            </aside>

            {/* Main content — pages inject here via children */}
            <main className="flex-1 overflow-y-auto bg-fog">
              {children}
            </main>

          </div>
        </div>

        <DesktopSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
        <DesktopSuggestModal open={suggestOpen} onClose={() => setSuggestOpen(false)} />
        <DesktopNewListingModal open={newListingOpen} onClose={() => setNewListingOpen(false)} />
      </div>
    </MarketContext.Provider>
  );
}
