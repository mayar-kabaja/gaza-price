"use client";

import { useAdminPlatformNumbers } from "@/lib/queries/hooks";

type PlaceType = { type: string; count: number };
type SearchEntry = { query: string; times: number };

interface PlatformNumbers {
  users: { total: number; verified: number; new_last_30d: number; unique_reporters: number };
  prices: { total_products: number; total_reports: number; reports_last_30d: number; total_confirmations: number; total_flags: number; total_votes: number; total_snapshots: number };
  geography: { total_areas: number; areas_with_prices: number; total_categories: number };
  places: { total: number; menu_items: number; menu_sections: number; orders: number; discount_codes: number; types: PlaceType[] };
  marketplace: { total_listings: number; saved_listings: number };
  engagement: { total_searches: number; searches_last_30d: number; conversations: number; messages: number; report_attempts: number; suggestions: number; menu_flags: number; top_searches: SearchEntry[] };
  community_interactions: number;
  platform_launch_date: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function AdminNumbersPage() {
  const { data: raw, isLoading } = useAdminPlatformNumbers();
  const d = raw as PlatformNumbers | undefined;

  if (isLoading || !d) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#243040] border-t-[#4A7C59] border-r-[#4A9FD4]" />
          <span className="text-sm text-[#8FA3B8]">Loading platform numbers...</span>
        </div>
      </div>
    );
  }

  const launch = d.platform_launch_date ? new Date(d.platform_launch_date) : null;
  const daysSinceLaunch = launch ? Math.floor((Date.now() - launch.getTime()) / 86400000) : null;

  return (
    <div className="flex flex-col gap-4 pb-10 max-w-[1100px]">

      {/* ── Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0f1a14] via-[#111820] to-[#18212C] border border-[#243040] p-8 pb-10">
        <div className="text-[10px] font-bold uppercase tracking-[3px] text-[#4A7C59] mb-3">Gaza Price</div>
        <div className="text-[32px] font-extrabold text-white tracking-tight leading-none mb-1">Platform Numbers</div>
        <div className="text-[13px] text-[#6B7F93]">
          {launch && <>{daysSinceLaunch} days since launch &middot; {launch.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>}
        </div>

        {/* Hero numbers row */}
        <div className="grid grid-cols-5 gap-6 mt-8">
          {[
            { n: d.users.total, label: "Users", accent: "#6BA880" },
            { n: d.prices.total_reports, label: "Price Reports", accent: "#7AC4F0" },
            { n: d.prices.total_products, label: "Products", accent: "#E8C98A" },
            { n: d.places.total, label: "Places", accent: "#B89AE8" },
            { n: d.engagement.total_searches, label: "Searches", accent: "#E8887A" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[36px] font-extrabold font-mono tracking-tight leading-none" style={{ color: s.accent }}>
                {fmt(s.n)}
              </div>
              <div className="text-[11px] font-medium text-[#6B7F93] mt-1.5 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column panels ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Users panel */}
        <div className="rounded-xl border border-[#243040] bg-[#111820] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#243040] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#6BA880]" />
            <span className="text-[12px] font-semibold text-[#D8E4F0] uppercase tracking-wider">Users & Community</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#8FA3B8]">Total Users</span>
              <span className="text-[24px] font-bold font-mono text-[#6BA880]">{fmt(d.users.total)}</span>
            </div>
            <div className="h-px bg-[#243040]" />
            <div className="grid grid-cols-3 gap-4">
              {[
                { n: d.users.verified, label: "Verified" },
                { n: d.users.new_last_30d, label: "New (30d)" },
                { n: d.users.unique_reporters, label: "Reporters" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[20px] font-bold font-mono text-[#D8E4F0]">{fmt(s.n)}</div>
                  <div className="text-[10px] text-[#6B7F93] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prices panel */}
        <div className="rounded-xl border border-[#243040] bg-[#111820] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#243040] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7AC4F0]" />
            <span className="text-[12px] font-semibold text-[#D8E4F0] uppercase tracking-wider">Prices & Data</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#8FA3B8]">Total Reports</span>
              <span className="text-[24px] font-bold font-mono text-[#7AC4F0]">{fmt(d.prices.total_reports)}</span>
            </div>
            <div className="h-px bg-[#243040]" />
            <div className="grid grid-cols-4 gap-3">
              {[
                { n: d.prices.total_confirmations, label: "Confirms" },
                { n: d.prices.total_votes, label: "Votes" },
                { n: d.prices.total_flags, label: "Flags" },
                { n: d.prices.total_snapshots, label: "Snapshots" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[18px] font-bold font-mono text-[#D8E4F0]">{fmt(s.n)}</div>
                  <div className="text-[10px] text-[#6B7F93] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#18212C] px-3.5 py-2.5">
              <span className="text-[11px] text-[#6B7F93]">Community Interactions</span>
              <span className="text-[15px] font-bold font-mono text-[#E8C98A]">{fmt(d.community_interactions)}</span>
            </div>
          </div>
        </div>

        {/* Places panel */}
        <div className="rounded-xl border border-[#243040] bg-[#111820] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#243040] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#B89AE8]" />
            <span className="text-[12px] font-semibold text-[#D8E4F0] uppercase tracking-wider">Places & Business</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#8FA3B8]">Registered Places</span>
              <span className="text-[24px] font-bold font-mono text-[#B89AE8]">{fmt(d.places.total)}</span>
            </div>
            <div className="h-px bg-[#243040]" />
            <div className="grid grid-cols-4 gap-3">
              {[
                { n: d.places.menu_items, label: "Menu Items" },
                { n: d.places.menu_sections, label: "Sections" },
                { n: d.places.orders, label: "Orders" },
                { n: d.places.discount_codes, label: "Discounts" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[18px] font-bold font-mono text-[#D8E4F0]">{fmt(s.n)}</div>
                  <div className="text-[10px] text-[#6B7F93] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Top types */}
            <div className="space-y-1.5">
              {d.places.types.slice(0, 5).map((t) => {
                const max = Math.max(1, ...d.places.types.map((x) => x.count));
                const pct = Math.round((t.count / max) * 100);
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#8FA3B8] w-24 truncate text-right" dir="rtl">{t.type}</span>
                    <div className="flex-1 h-[6px] rounded-full bg-[#1E2B38] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#8B6FD4] to-[#B89AE8]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#B89AE8] w-6 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Engagement panel */}
        <div className="rounded-xl border border-[#243040] bg-[#111820] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#243040] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E8887A]" />
            <span className="text-[12px] font-semibold text-[#D8E4F0] uppercase tracking-wider">Engagement</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#8FA3B8]">Total Searches</span>
              <span className="text-[24px] font-bold font-mono text-[#E8887A]">{fmt(d.engagement.total_searches)}</span>
            </div>
            <div className="h-px bg-[#243040]" />
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: d.engagement.searches_last_30d, label: "Searches (30d)" },
                { n: d.engagement.conversations, label: "Conversations" },
                { n: d.engagement.messages, label: "Messages" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[18px] font-bold font-mono text-[#D8E4F0]">{fmt(s.n)}</div>
                  <div className="text-[10px] text-[#6B7F93] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: d.engagement.suggestions, label: "Suggestions" },
                { n: d.marketplace.total_listings, label: "Listings" },
                { n: d.marketplace.saved_listings, label: "Saved" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[18px] font-bold font-mono text-[#D8E4F0]">{fmt(s.n)}</div>
                  <div className="text-[10px] text-[#6B7F93] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Coverage bar ── */}
      <div className="rounded-xl border border-[#243040] bg-[#111820] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#243040] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#E8C98A]" />
          <span className="text-[12px] font-semibold text-[#D8E4F0] uppercase tracking-wider">Coverage</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#243040]">
          {[
            { n: d.geography.total_areas, label: "Areas", accent: "#6BA880" },
            { n: d.geography.areas_with_prices, label: "Areas with Prices", accent: "#7AC4F0" },
            { n: d.geography.total_categories, label: "Categories", accent: "#E8C98A" },
          ].map((s) => (
            <div key={s.label} className="text-center py-5">
              <div className="text-[28px] font-extrabold font-mono" style={{ color: s.accent }}>{fmt(s.n)}</div>
              <div className="text-[11px] text-[#6B7F93] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Searches ── */}
      {d.engagement.top_searches.length > 0 && (
        <div className="rounded-xl border border-[#243040] bg-[#111820] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#243040] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E8C98A]" />
            <span className="text-[12px] font-semibold text-[#D8E4F0] uppercase tracking-wider">Top Search Terms</span>
          </div>
          <div className="divide-y divide-[#243040]/50">
            {d.engagement.top_searches.map((s, i) => {
              const max = Math.max(1, ...d.engagement.top_searches.map((x) => x.times));
              const pct = Math.round((s.times / max) * 100);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[11px] font-mono text-[#4E6070] w-5 text-right">{i + 1}</span>
                  <span className="text-[13px] font-medium text-[#D8E4F0] w-20" dir="rtl">{s.query}</span>
                  <div className="flex-1 h-[5px] rounded-full bg-[#1E2B38] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8C98A]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[13px] font-mono font-bold text-[#E8C98A] w-12 text-right">{fmt(s.times)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
