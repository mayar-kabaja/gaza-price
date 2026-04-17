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
        if (res.status === 401) {
          setError("يجب تسجيل الدخول لعرض المحادثات");
          setLoading(false);
          return;
        }
        throw new Error(`${res.status}`);
      }
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError("تعذر تحميل المحادثات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConversations();
    intervalRef.current = setInterval(fetchConversations, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm text-mist mb-3">{error}</p>
            <button
              onClick={onRetry}
              className="px-4 py-1.5 bg-olive text-white rounded-full text-xs font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-4xl mb-3">💬</div>
            <p className="font-display font-bold text-ink text-sm mb-1">
              لا توجد محادثات
            </p>
            <p className="text-xs text-mist">راسل البائعين من السوق</p>
          </div>
        </div>
      )}

      {!loading && !error && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className="w-full flex gap-3 px-3 py-3 text-right border-b border-border/40 hover:bg-fog transition-colors"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-fog flex items-center justify-center flex-shrink-0">
                {conv.listing_image ? (
                  <Image
                    src={conv.listing_image}
                    alt={conv.listing_title ?? ""}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-xl">📦</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="font-display font-bold text-xs truncate">
                    {conv.listing_title ?? "إعلان محذوف"}
                  </span>
                  <span className="text-[10px] text-mist">
                    {timeAgo(conv.last_message_at ?? conv.created_at)}
                  </span>
                </div>

                <p className="text-[11px] text-mist truncate">
                  {conv.last_message
                    ? conv.last_message.type === "image"
                      ? "📷 صورة"
                      : conv.last_message.content
                    : "ابدأ المحادثة"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────

export default function ChatInboxPage() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { conversations, loading, error, fetchConversations } =
    useConversations();

  useMarketSidebar(
    isDesktop && (loading || error || conversations.length > 0) ? (
      <div className="flex flex-col h-full -m-3">
        <div className="px-4 py-2.5 border-b border-border">
          <h2 className="font-display font-bold text-sm">المحادثات</h2>
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

  // DESKTOP
  if (isDesktop) {
    return (
      <div className="h-full flex items-center justify-center bg-fog text-center">
        <div className="bg-surface rounded-2xl border border-border shadow-sm px-10 py-12 text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-olive-pale flex items-center justify-center mb-4">
            <span className="text-3xl">💬</span>
          </div>
          {conversations.length === 0 ? (
            <>
              <div className="font-bold">لا توجد محادثات بعد</div>
              <p className="text-sm text-mist">
                تصفح السوق وراسل البائعين للبدء
              </p>
            </>
          ) : (
            <>
              <div className="font-bold">اختر محادثة</div>
              <p className="text-sm text-mist">
                اختر محادثة من القائمة للبدء
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // MOBILE
  return (
    <div className="flex flex-col min-h-dvh bg-fog" dir="rtl">
      <div className="bg-olive px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white p-1 rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-display font-bold text-lg text-white">المحادثات</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-border flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-2/3 bg-border rounded" />
                  <div className="h-3 w-full bg-border rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <div className="text-4xl mb-3">⚠️</div>
              <p className="mb-3 text-sm text-mist">{error}</p>
              <button
                onClick={fetchConversations}
                className="px-5 py-2 bg-olive text-white rounded-full text-sm font-semibold"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="flex items-center justify-center h-64 text-center">
            <div>
              <div className="text-5xl mb-4">💬</div>
              <div className="font-bold mb-1">لا توجد محادثات بعد</div>
              <p className="text-sm text-mist">تصفح السوق وراسل البائعين للبدء</p>
            </div>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="bg-surface">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => router.push(`/market/chat/${conv.id}`)}
                className="w-full flex gap-3 px-4 py-3.5 text-right border-b border-border/40 active:bg-fog transition-colors"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-fog flex items-center justify-center flex-shrink-0">
                  {conv.listing_image ? (
                    <Image
                      src={conv.listing_image}
                      alt={conv.listing_title ?? ""}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xl">📦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-display font-bold text-sm text-ink truncate">
                      {conv.listing_title ?? "إعلان محذوف"}
                    </span>
                    <span className="text-[10px] text-mist flex-shrink-0 mr-2">
                      {timeAgo(conv.last_message_at ?? conv.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-mist truncate">
                    {conv.last_message
                      ? conv.last_message.type === "image"
                        ? "📷 صورة"
                        : conv.last_message.content
                      : "ابدأ المحادثة"}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 rounded-full bg-olive flex items-center justify-center flex-shrink-0 self-center">
                    <span className="text-[10px] font-bold text-white">{conv.unread_count}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}