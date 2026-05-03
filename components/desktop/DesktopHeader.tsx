"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DesktopSearchBar } from "./DesktopSearchBar";
import type { Area, Governorate } from "@/types/app";
import { useAreas } from "@/lib/queries/hooks";
import { useArea } from "@/hooks/useArea";
import { useTheme } from "@/hooks/useTheme";
import { useSession } from "@/hooks/useSession";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { cn } from "@/lib/utils";

const GOV_LABELS: Record<Governorate, string> = {
  central: "وسط غزة",
  south: "جنوب غزة",
  north: "شمال غزة",
};
const GOV_ORDER: Governorate[] = ["central", "south", "north"];

interface DesktopHeaderProps {
  onSubmitClick: () => void;
  onSuggestClick: () => void;
  onNewListingClick?: () => void;
  onAddClick?: () => void;
  onMarketClick?: () => void;
  onProfileClick?: () => void;
  isProfileActive?: boolean;
}

export function DesktopHeader({ onSubmitClick, onSuggestClick, onNewListingClick, onAddClick, onMarketClick, onProfileClick, isProfileActive }: DesktopHeaderProps) {
  const { area, saveArea, clearArea } = useArea();
  const { theme, toggle: toggleTheme } = useTheme();
  const { contributor, refreshContributor, logout } = useSession();
  const { data: areasData } = useAreas();
  const areas = (areasData as { areas?: Area[] })?.areas ?? [];

  const [open, setOpen] = useState(false);
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>({});
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !showProfileMenu) return;
    function handleClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (showProfileMenu && profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, showProfileMenu]);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const profileInitial = contributor?.display_handle?.trim()?.slice(0, 1) || "م";

  const areasByGov = GOV_ORDER.map((gov) => ({
    gov,
    label: GOV_LABELS[gov],
    areas: areas.filter((a) => a.governorate === gov),
  })).filter((g) => g.areas.length > 0);

  return (
    <header className="h-[60px] bg-olive-deep border-b border-white/8 flex items-center gap-4 px-5 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <img src="/logo.svg" alt="" className="w-[34px] h-[34px] rounded-full" />
        <div>
          <div className="font-display font-extrabold text-[17px] text-white leading-tight">
            غزة<span className="text-sand">بريس</span>
          </div>
          <div className="text-[10px] text-white/50 font-body leading-none">أسعار شفافة</div>
        </div>
      </Link>

      {/* Divider */}
      <div className="w-px h-7 bg-white/12 flex-shrink-0" />

      {/* Search */}
      <DesktopSearchBar />

      {/* Area picker */}
      <div className="relative flex-shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-[5px] rounded-full bg-white/7 border border-white/12 text-white/85 text-[13px] font-body hover:bg-white/12 transition-colors cursor-pointer"
        >
          <span className="w-[7px] h-[7px] rounded-full bg-confirm flex-shrink-0" />
          {area ? area.name_ar : "اختر منطقة"}
          <span className="text-[10px] opacity-60">▾</span>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fade-up">
            <div className="max-h-64 overflow-y-auto no-scrollbar p-2">
              {area && (
                <button
                  type="button"
                  onClick={() => { clearArea(); setOpen(false); }}
                  className="w-full px-3 py-1.5 mb-1 rounded-lg text-sm font-body text-sand hover:bg-sand/5 transition-colors text-right cursor-pointer"
                >
                  كل المناطق
                </button>
              )}
              {areasByGov.map((group) => {
                const isGovOpen = openGovs[group.gov] ?? false;
                return (
                  <div key={group.gov}>
                    <button
                      type="button"
                      onClick={() => setOpenGovs((prev) => ({ ...prev, [group.gov]: !prev[group.gov] }))}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-display font-bold text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                    >
                      <span>{group.label}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={cn("text-mist transition-transform", isGovOpen && "rotate-90")}
                      >
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                    {isGovOpen && (
                      <div className="mr-3 mt-0.5 space-y-0.5">
                        {group.areas.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => { saveArea(a); setOpen(false); }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-body transition-colors text-right cursor-pointer",
                              area?.id === a.id
                                ? "bg-olive-pale text-olive font-semibold"
                                : "text-slate hover:bg-fog hover:text-ink"
                            )}
                          >
                            <span>{a.name_ar}</span>
                            {a.active_reports_count != null && a.active_reports_count > 0 && (
                              <span className="text-[11px] text-mist bg-fog rounded-full px-2 py-0.5">
                                {a.active_reports_count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Single Add button */}
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-[12px] font-display font-bold hover:bg-white/25 transition-all whitespace-nowrap cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          إضافة
        </button>

        <div className="w-px h-5 bg-white/12 mx-1" />

        {/* Login / Profile */}
        {contributor?.phone_verified ? (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu((v) => !v)}
              className={cn(
                "w-[32px] h-[32px] rounded-full flex items-center justify-center text-white font-display font-bold text-[12px] bg-white/15 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer flex-shrink-0",
                isProfileActive && "ring-2 ring-white/40"
              )}
              title="حسابي"
            >
              {profileInitial}
            </button>

            {showProfileMenu && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fade-up">
                <div className="px-4 py-3 border-b border-fog">
                  <div className="font-display font-bold text-sm text-ink truncate">
                    {contributor.display_handle || "مساهم"}
                  </div>
                  <div className="text-[11px] text-mist font-mono mt-0.5">
                    #{(contributor.anon_session_id ?? contributor.id ?? "").slice(-4)}
                  </div>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { setShowProfileMenu(false); onProfileClick?.(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-mist">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    حسابي
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowProfileMenu(false); setShowChangePhone(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-mist">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 9.18 19.79 19.79 0 01.88 2.27 2 2 0 012.88.09H5.9a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.19-1.19a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    تغيير رقم الهاتف
                  </button>
                  <div className="h-px bg-fog mx-3 my-1" />
                  <button
                    type="button"
                    onClick={() => { setShowProfileMenu(false); setShowLogoutConfirm(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50/50 transition-colors text-right cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-[12px] font-display font-bold hover:bg-white/25 transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            دخول
          </button>
        )}

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex-shrink-0"
          aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {theme === "dark" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-surface rounded-2xl p-5 shadow-xl" style={{ width: "min(24rem, calc(100vw - 2rem))" }}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </div>
              <h3 className="font-display font-bold text-ink text-base mb-1">تسجيل الخروج</h3>
              <p className="text-sm text-mist">هل تريد تسجيل الخروج من حسابك؟</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-ink font-semibold text-sm hover:bg-fog transition-colors cursor-pointer">
                إلغاء
              </button>
              <button type="button" onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors cursor-pointer">
                خروج
              </button>
            </div>
          </div>
        </>
      )}

      {/* Login phone popup */}
      <PhoneAuthPopup
        open={showLogin}
        mode="login"
        onClose={() => setShowLogin(false)}
        onVerified={async () => {
          await refreshContributor();
          setShowLogin(false);
        }}
      />

      {/* Change phone popup */}
      <PhoneAuthPopup
        open={showChangePhone}
        mode="login"
        onClose={() => setShowChangePhone(false)}
        onVerified={async () => {
          setShowChangePhone(false);
          await refreshContributor();
        }}
      />

    </header>
  );
}
