"use client";

import { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
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

function useSidebarHasContent() {
  const { content } = useSyncExternalStore(_sidebarSubscribe, _getSidebarSnapshot, _getServerSnapshot);
  return content != null;
}

function SidebarAside() {
  const hasContent = useSidebarHasContent();
  if (!hasContent) return null;
  return (
    <aside className="w-[280px] flex-shrink-0 flex flex-col border-l border-border/40 pt-5 pb-4 px-3 gap-4 bg-surface sticky top-0 self-start h-[calc(100vh-96px)] overflow-y-auto">
      <p className="text-[15px] font-display font-bold text-ink pr-1">الأقسام</p>
      <div>
        <SidebarSlot />
      </div>
    </aside>
  );
}

// ── Global hero store (full-width hero above sidebar row) ──
let _heroSnapshot: { content: React.ReactNode } = { content: null };
const _heroListeners = new Set<() => void>();

function _heroSubscribe(cb: () => void) {
  _heroListeners.add(cb);
  return () => _heroListeners.delete(cb);
}
function _getHeroSnapshot() { return _heroSnapshot; }
function _getHeroServerSnapshot() { return _heroSnapshot; }

export function setGlobalHeroContent(content: React.ReactNode) {
  if (_heroSnapshot.content === content) return;
  _heroSnapshot = { content };
  _heroListeners.forEach(l => l());
}

export function useGlobalHero(content: React.ReactNode) {
  const ref = useRef(content);
  ref.current = content;
  useLayoutEffect(() => {
    setGlobalHeroContent(ref.current);
  });
}

function HeroSlot() {
  const { content } = useSyncExternalStore(_heroSubscribe, _getHeroSnapshot, _getHeroServerSnapshot);
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
    <footer className="bg-olive-deep text-white/70 mt-6" dir="rtl">
      {/* Top section */}
      <div className="px-7 pt-10 pb-8 grid grid-cols-[2fr_1fr_1fr_1fr] gap-10 border-b border-white/10">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.svg" alt="" className="w-[34px] h-[34px] rounded-full" />
            <div className="font-display font-extrabold text-[20px] text-white leading-tight">
              غزة<span className="text-sand">بريس</span>
            </div>
          </div>
          <p className="text-[13px] text-white/50 leading-relaxed max-w-[280px]">
            منصة مجتمعية لمتابعة أسعار السلع الأساسية في غزة — شفافية حقيقية، من الناس وللناس.
          </p>
        </div>

        {/* Platform links */}
        <div>
          <div className="text-[11px] font-bold text-white/40 tracking-wider mb-4">المنصة</div>
          <div className="flex flex-col gap-2.5">
            <Link href="/" className="text-[13px] text-white/65 hover:text-white transition-colors">الأسعار اليوم</Link>
            <Link href="/places" className="text-[13px] text-white/65 hover:text-white transition-colors">المحلات والمطاعم</Link>
            <Link href="/market" className="text-[13px] text-white/65 hover:text-white transition-colors">السوق المحلي</Link>
          </div>
        </div>

        {/* For owners */}
        <div>
          <div className="text-[11px] font-bold text-white/40 tracking-wider mb-4">للأصحاب</div>
          <div className="flex flex-col gap-2.5">
            <Link href="/places/register" className="text-[13px] text-white/65 hover:text-white transition-colors">سجّل محلك</Link>
            <Link href="/submit" className="text-[13px] text-white/65 hover:text-white transition-colors">أبلغ عن سعر</Link>
            <Link href="/suggest" className="text-[13px] text-white/65 hover:text-white transition-colors">اقترح منتج</Link>
          </div>
        </div>

        {/* About */}
        <div>
          <div className="text-[11px] font-bold text-white/40 tracking-wider mb-4">عن المنصة</div>
          <div className="flex flex-col gap-2.5">
            <Link href="/about" className="text-[13px] text-white/65 hover:text-white transition-colors">من نحن</Link>
            <Link href="/contact" className="text-[13px] text-white/65 hover:text-white transition-colors">تواصل معنا</Link>
            <Link href="/privacy" className="text-[13px] text-white/65 hover:text-white transition-colors">سياسة الخصوصية</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-7 py-4 flex items-center justify-between">
        <div className="text-[12px] text-white/30">© 2026 غزة بريس · gazaprice.com · جميع الحقوق محفوظة</div>
        <div className="flex gap-2">
          <a href="https://www.instagram.com/gaza.price.watch" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="https://wa.me/972567786946" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
          </a>
        </div>
      </div>
    </footer>
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
  const [emptyCartOpen, setEmptyCartOpen] = useState(false);

  // Listen for global "open-cart" — only show empty cart fallback if NOT on a place page
  // (place pages have their own listener with real cart data)
  useEffect(() => {
    const handler = () => {
      const onPlacePage = /^\/places\/[^/]+$/.test(window.location.pathname)
        && !window.location.pathname.endsWith('/register')
        && !window.location.pathname.endsWith('/dashboard');
      if (!onPlacePage) {
        setEmptyCartOpen(true);
      }
    };
    window.addEventListener('open-cart', handler);
    return () => window.removeEventListener('open-cart', handler);
  }, []);

  const skipShell = pathname.startsWith("/gp-ctrl") || pathname.startsWith("/places/dashboard") || pathname.startsWith("/onboarding") || pathname.match(/^\/places\/[^/]+\/menu$/);

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
        <div className={isDesktop ? "flex-1 overflow-y-auto bg-fog" : "contents"}>

            {/* Sidebar + content row */}
            <div className={isDesktop ? "flex min-h-0" : "contents"}>

            {/* Icon nav sidebar — right side in RTL (first in flex), sticky */}
            {isDesktop && (
              <nav className="w-[82px] flex-shrink-0 border-l border-border/40 flex flex-col items-center py-4 gap-1 sticky top-0 self-start h-[calc(100vh-96px)] bg-surface">
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
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors w-full ${active ? "bg-olive-pale" : "hover:bg-fog"}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? style.activeBg : style.bg}`}>
                        <span className={`${style.text} [&_svg]:w-[18px] [&_svg]:h-[18px]`}>{icon}</span>
                      </div>
                      <span className={`text-[11px] leading-tight ${active ? "font-bold text-olive" : "text-mist"}`}>{label}</span>
                    </Link>
                  );
                })}

              </nav>
            )}

            {/* Categories / filters sidebar */}
            {isDesktop && <SidebarAside />}

            {/* Main content */}
            <div className={isDesktop ? "flex-1 min-w-0 flex flex-col" : "contents"}>
              <main className={isDesktop ? "flex-1 bg-fog relative" : "contents"}>
                {isDesktop && pathname === "/" && <HeroSlot />}
                {children}
              </main>
            </div>

            </div>{/* close sidebar+content row */}

            {isDesktop && <DesktopFooter />}
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

        {/* Global modals — work on both mobile and desktop */}
        {emptyCartOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setEmptyCartOpen(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-surface rounded-2xl p-6 shadow-xl text-center" style={{ width: "min(22rem, calc(100vw - 2rem))" }}>
              <div className="text-[40px] mb-3">🛒</div>
              <h3 className="font-display font-bold text-ink text-base mb-1">سلة الطلب فارغة</h3>
              <p className="text-sm text-mist mb-4">ادخل على محل وأضف منتجات للسلة</p>
              <button type="button" onClick={() => setEmptyCartOpen(false)} className="px-6 py-2 rounded-xl bg-olive text-white font-display font-bold text-sm hover:bg-olive-deep transition-colors cursor-pointer">
                حسناً
              </button>
            </div>
          </>
        )}
      </div>
    </GlobalContext.Provider>
  );
}
