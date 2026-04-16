"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BottomNav } from "@/components/layout/BottomNav";
import { apiFetch } from "@/lib/api/fetch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useMarketSidebar } from "@/app/market/layout";

interface LastMessage {
  content: string;
  created_at: string;
  type: string;
}

interface Conversation {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  buyer_id: string;
  seller_id: string;
  my_role: "buyer" | "seller";
  last_message: LastMessage | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}ي`;
  return `${Math.floor(days / 7)}أ`;
}

function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchConversations() {
    try {
      const res = await apiFetch("/api/chat/conversations");
      if (!res.ok) {
        if (res.status === 401) { setError("يجب تسجيل الدخول لعرض المحادثات"); setLoading(false); return; }
        throw new Error(`${res.status}`);
      }
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
      setError(null);
    } catch { setError("تعذر تحميل المحادثات"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchConversations();
    intervalRef.current = setInterval(fetchConversations, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return { conversations, loading, error, fetchConversations };
}

export function ConversationList({
  conversations,
  loading,
  error,
  activeId,
  onSelect,
  onRetry,
}: {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  activeId?: string;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {loading && (
        <div className="p-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-fog flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 w-2/3 bg-fog rounded" />
                <div className="h-3 w-full bg-fog rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm text-mist mb-3">{error}</p>
          <button onClick={onRetry} className="px-4 py-1.5 bg-olive text-white rounded-full text-xs font-semibold">إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="font-display font-bold text-ink text-sm mb-1">لا توجد محادثات</p>
          <p className="text-xs text-mist">راسل البائعين من السوق</p>
        </div>
      )}

      {!loading && !error && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex gap-3 px-3 py-3 text-right transition-colors border-b border-border/40 last:border-0 ${
                activeId === conv.id ? "bg-olive-pale" : "hover:bg-fog"
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-fog flex items-center justify-center">
                {conv.listing_image ? (
                  <Image src={conv.listing_image} alt={conv.listing_title ?? ""} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span className="text-xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <span className={`font-display font-bold text-xs truncate flex-1 ${activeId === conv.id ? "text-olive-deep" : "text-ink"}`}>
                    {conv.listing_title ?? "إعلان محذوف"}
                  </span>
                  <span className="text-[10px] text-mist flex-shrink-0">{timeAgo(conv.last_message_at ?? conv.created_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] text-mist truncate flex-1">
                    {conv.last_message ? (conv.last_message.type === "image" ? "📷 صورة" : conv.last_message.content) : "ابدأ المحادثة"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-olive text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {conv.unread_count > 99 ? "99+" : conv.unread_count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-olive/70 font-semibold">{conv.my_role === "buyer" ? "أنت المشتري" : "أنت البائع"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entry point ────────────────────────────────────────────────────────────────

export default function ChatInboxPage() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { conversations, loading, error, fetchConversations } = useConversations();

  // Register sidebar content unconditionally (hook rule)
  useMarketSidebar(
    isDesktop ? (
      <div className="flex flex-col h-full -m-3">
        <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
          <h2 className="font-display font-bold text-sm text-ink">المحادثات</h2>
        </div>
        <ConversationList
          conversations={conversations}
          loading={loading}
          error={error}
          onSelect={(id) => router.push(`/market/chat/${id}`)}
          onRetry={fetchConversations}
        />
      </div>
    ) : null
  );

  if (isDesktop) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-fog">
        <div className="text-5xl mb-4">💬</div>
        <div className="font-display font-bold text-ink mb-1">اختر محادثة</div>
        <p className="text-sm text-mist">اختر محادثة من القائمة للبدء</p>
      </div>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-dvh bg-fog" dir="rtl">
      <div className="bg-surface border-b border-border flex items-center gap-3 px-4 py-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-mist p-1 -mr-1 rounded-lg hover:bg-fog transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-display font-bold text-lg text-ink flex-1">المحادثات</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading && (
          <div className="px-4 pt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-border/60 p-4 flex gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-fog flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-fog rounded" />
                  <div className="h-3 w-full bg-fog rounded" />
                  <div className="h-3 w-1/3 bg-fog rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-display font-bold text-ink mb-1">تعذر التحميل</div>
            <p className="text-sm text-mist mb-4">{error}</p>
            <button onClick={fetchConversations} className="px-5 py-2.5 bg-olive text-white rounded-full font-semibold text-sm">إعادة المحاولة</button>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">💬</div>
            <div className="font-display font-bold text-ink text-lg mb-1">لا توجد محادثات بعد</div>
            <p className="text-sm text-mist mb-6">تصفح السوق وراسل البائعين للبدء</p>
            <button onClick={() => router.push("/market")} className="px-5 py-2.5 bg-olive text-white rounded-full font-semibold text-sm">تصفح السوق</button>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="px-4 pt-4 space-y-3">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => router.push(`/market/chat/${conv.id}`)}
                className="w-full bg-surface rounded-2xl border border-border/60 shadow-sm p-4 flex gap-3 active:scale-[0.98] transition-transform text-right"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-fog flex items-center justify-center">
                  {conv.listing_image ? (
                    <Image src={conv.listing_image} alt={conv.listing_title ?? ""} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="font-display font-bold text-sm text-ink truncate flex-1">{conv.listing_title ?? "إعلان محذوف"}</span>
                    <span className="text-[10px] text-mist flex-shrink-0">{timeAgo(conv.last_message_at ?? conv.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-mist truncate flex-1">
                      {conv.last_message ? (conv.last_message.type === "image" ? "📷 صورة" : conv.last_message.content) : "ابدأ المحادثة"}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 bg-olive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-olive font-semibold mt-0.5 block">{conv.my_role === "buyer" ? "أنت المشتري" : "أنت البائع"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
