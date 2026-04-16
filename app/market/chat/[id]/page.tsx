"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useMarketSidebar } from "@/app/market/layout";
import { ConversationList } from "../page";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  type: string;
  created_at: string;
}

interface ConversationInfo {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  buyer_id: string;
  seller_id: string;
  my_role: "buyer" | "seller";
  other_last_active_at: string | null;
}

interface ConversationSummary {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  buyer_id: string;
  seller_id: string;
  my_role: "buyer" | "seller";
  last_message: { content: string; created_at: string; type: string } | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

function getOnlineStatus(lastActiveAt: string | null): { online: boolean; label: string } {
  if (!lastActiveAt) return { online: false, label: "غير متصل" };
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 5) return { online: true, label: "متصل الآن" };
  if (mins < 60) return { online: false, label: `آخر ظهور منذ ${mins} د` };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { online: false, label: `آخر ظهور منذ ${hrs} س` };
  return { online: false, label: `آخر ظهور منذ ${Math.floor(hrs / 24)} ي` };
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "اليوم";
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar", { day: "numeric", month: "long" });
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

// ── Shared chat hook ──────────────────────────────────────────────────────────

function useChatDetail(id: string) {
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [visibleCount, setVisibleCount] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myId = useRef<string | null>(null);

  function getMyId(conv: ConversationInfo): string {
    return conv.my_role === "buyer" ? conv.buyer_id : conv.seller_id;
  }

  const fetchMessages = useCallback(async (scroll = false) => {
    try {
      const res = await apiFetch(`/api/chat/conversations/${id}/messages`);
      if (!res.ok) {
        if (res.status === 401) { setError("يجب تسجيل الدخول"); setLoading(false); return; }
        if (res.status === 403) { setError("ليس لديك صلاحية الوصول لهذه المحادثة"); setLoading(false); return; }
        throw new Error(`${res.status}`);
      }
      const data = await res.json();
      setConversation(data.conversation);
      if (data.conversation) myId.current = getMyId(data.conversation);
      const serverMessages = Array.isArray(data.messages) ? data.messages : [];
      setMessages(serverMessages);
      setPendingMessages((prev) => {
        if (prev.length === 0) return prev;
        const serverContents = new Set(serverMessages.map((m: Message) => m.content + m.sender_id));
        return prev.filter((p) => !serverContents.has(p.content + p.sender_id));
      });
      setError(null);
      if (scroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { setError("تعذر تحميل الرسائل"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchMessages(true);
    intervalRef.current = setInterval(() => fetchMessages(false), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMessages]);

  const totalCount = messages.length + pendingMessages.length;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [totalCount]);

  async function handleSend() {
    const content = inputText.trim();
    if (!content) return;
    setSending(true);
    setInputText("");
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: id,
      sender_id: myId.current ?? (conversation ? getMyId(conversation) : ""),
      content, is_read: false, type: "text",
      created_at: new Date().toISOString(),
    };
    setPendingMessages((prev) => [...prev, optimisticMsg]);
    try {
      const res = await apiFetch(`/api/chat/conversations/${id}/messages`, {
        method: "POST", body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setInputText(content);
        const data = await res.json();
        alert(data.message || "فشل إرسال الرسالة");
        return;
      }
      await fetchMessages(false);
    } catch {
      setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(content);
      alert("تعذر الإرسال — تحقق من الإنترنت");
    } finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  type MessageGroup = { date: string; messages: Message[] };
  function groupByDate(msgs: Message[]): MessageGroup[] {
    const groups: MessageGroup[] = [];
    let lastDate = "";
    for (const msg of msgs) {
      const date = formatDate(msg.created_at);
      if (date !== lastDate) { groups.push({ date, messages: [msg] }); lastDate = date; }
      else groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }

  const allMessages = [...messages, ...pendingMessages];
  const hasOlderMessages = allMessages.length > visibleCount;
  const visibleMessages = hasOlderMessages ? allMessages.slice(-visibleCount) : allMessages;
  const groups = groupByDate(visibleMessages);
  const currentMyId = myId.current ?? (conversation ? getMyId(conversation) : null);

  return {
    conversation, loading, error, inputText, setInputText,
    sending, bottomRef, handleSend, handleKeyDown,
    allMessages, hasOlderMessages, groups, currentMyId,
    visibleCount, setVisibleCount,
  };
}

// ── Messages view (shared between desktop and mobile) ─────────────────────────

function MessagesView({ id }: { id: string }) {
  const {
    conversation, loading, error, inputText, setInputText,
    sending, bottomRef, handleSend, handleKeyDown,
    allMessages, hasOlderMessages, groups, currentMyId,
    setVisibleCount,
  } = useChatDetail(id);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-olive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-4xl">😕</div>
        <div className="font-display font-bold text-ink">{error}</div>
      </div>
    );
  }

  return (
    <>
      {/* Chat header */}
      <div className="bg-surface border-b border-border flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-fog flex items-center justify-center">
          {conversation?.listing_image ? (
            <Image src={conversation.listing_image} alt="" width={36} height={36} className="w-full h-full object-cover" unoptimized />
          ) : (
            <span className="text-lg">📦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/market/${conversation?.listing_id}`} className="font-display font-bold text-sm text-ink truncate hover:text-olive transition-colors block">
            {conversation?.listing_title ?? "محادثة"}
          </Link>
          {conversation && (() => {
            const status = getOnlineStatus(conversation.other_last_active_at);
            return (
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.online ? "bg-green-500" : "bg-gray-400"}`} />
                <span className={`text-[10px] font-medium ${status.online ? "text-green-600" : "text-gray-400"}`}>{status.label}</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {hasOlderMessages && (
          <div className="flex justify-center py-2">
            <button onClick={() => setVisibleCount((c) => c + 40)} className="text-[11px] font-semibold text-olive bg-olive/10 px-4 py-1.5 rounded-full">
              عرض الرسائل الأقدم
            </button>
          </div>
        )}

        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="font-display font-bold text-ink mb-1">ابدأ المحادثة</p>
            <p className="text-sm text-mist">أرسل رسالتك الأولى</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-mist font-semibold px-2">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {group.messages.map((msg) => {
              const isMe = msg.sender_id === currentMyId;
              const isOptimistic = msg.id.startsWith("optimistic-");
              return (
                <div key={msg.id} className={`flex mb-2 ${isMe ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMe ? "bg-olive text-white rounded-tr-sm" : "bg-surface text-ink border border-border/60 rounded-tl-sm"
                  } ${isOptimistic ? "opacity-70" : ""}`}>
                    <p className="text-sm leading-relaxed break-words">
                      {msg.type === "image" ? <span className="flex items-center gap-1">📷 <span>صورة</span></span> : msg.content}
                    </p>
                    {isOptimistic ? (
                      <div className="flex items-center gap-[3px] mt-1.5 justify-start">
                        <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <p className={`text-[10px] mt-1 ${isMe ? "text-white/70 text-left" : "text-mist text-right"}`} dir="ltr">
                        {formatTime(msg.created_at)}
                        {isMe && <span className="mr-1">{msg.is_read ? " ✓✓" : " ✓"}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-surface border-t border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          className="flex-1 bg-fog border border-border rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
          dir="rtl"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
          className="w-10 h-10 bg-olive text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 rotate-180">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  );
}

// ── Desktop conversations sidebar data hook ────────────────────────────────────

function useDesktopConversations() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [convsError, setConvsError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchConversations() {
    try {
      const res = await apiFetch("/api/chat/conversations");
      if (!res.ok) { if (res.status === 401) { setConvsError("يجب تسجيل الدخول"); setConvsLoading(false); return; } throw new Error(); }
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
      setConvsError(null);
    } catch { setConvsError("تعذر التحميل"); }
    finally { setConvsLoading(false); }
  }

  useEffect(() => {
    fetchConversations();
    intervalRef.current = setInterval(fetchConversations, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return { conversations, convsLoading, convsError, fetchConversations, router };
}

// ── Entry point ────────────────────────────────────────────────────────────────

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isDesktop = useIsDesktop();
  const { conversations, convsLoading, convsError, fetchConversations, router } = useDesktopConversations();

  // Register sidebar content unconditionally (hook rule)
  useMarketSidebar(
    isDesktop ? (
      <div className="flex flex-col h-full -m-3">
        <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
          <h2 className="font-display font-bold text-sm text-ink">المحادثات</h2>
        </div>
        <ConversationList
          conversations={conversations}
          loading={convsLoading}
          error={convsError}
          activeId={id}
          onSelect={(cid) => router.push(`/market/chat/${cid}`)}
          onRetry={fetchConversations}
        />
      </div>
    ) : null
  );

  if (isDesktop) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-fog">
        <MessagesView id={id} />
      </div>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return <MobileChatDetail id={id} />;
}

// ── Mobile layout component ────────────────────────────────────────────────────

function MobileChatDetail({ id }: { id: string }) {
  const router = useRouter();
  const {
    conversation, loading, error, inputText, setInputText,
    sending, bottomRef, handleSend, handleKeyDown,
    allMessages, hasOlderMessages, groups, currentMyId,
    setVisibleCount,
  } = useChatDetail(id);

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-fog" dir="rtl">
        <div className="bg-surface border-b border-border flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="text-mist p-1 rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="h-4 w-40 bg-fog rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-olive border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-dvh bg-fog items-center justify-center gap-4 px-6 text-center" dir="rtl">
        <div className="text-5xl">😕</div>
        <div className="font-display font-bold text-ink">{error}</div>
        <button onClick={() => router.back()} className="text-olive text-sm font-semibold">← رجوع</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-fog" dir="rtl">
      <div className="bg-surface border-b border-border flex items-center gap-3 px-4 py-3 flex-shrink-0 z-10">
        <button onClick={() => router.back()} className="text-mist p-1 -mr-1 rounded-lg hover:bg-fog transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-ink truncate">{conversation?.listing_title ?? "محادثة"}</p>
          {conversation && (() => {
            const status = getOnlineStatus(conversation.other_last_active_at);
            return (
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.online ? "bg-green-500" : "bg-gray-400"}`} />
                <span className={`text-[10px] font-medium ${status.online ? "text-green-600" : "text-gray-400"}`}>{status.label}</span>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {hasOlderMessages && (
          <div className="flex justify-center py-2">
            <button onClick={() => setVisibleCount((c) => c + 40)} className="text-[11px] font-semibold text-olive bg-olive/10 px-4 py-1.5 rounded-full">
              عرض الرسائل الأقدم
            </button>
          </div>
        )}
        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="font-display font-bold text-ink mb-1">ابدأ المحادثة</p>
            <p className="text-sm text-mist">أرسل رسالتك الأولى للبائع</p>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-mist font-semibold px-2">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {group.messages.map((msg) => {
              const isMe = msg.sender_id === currentMyId;
              const isOptimistic = msg.id.startsWith("optimistic-");
              return (
                <div key={msg.id} className={`flex mb-2 ${isMe ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMe ? "bg-olive text-white rounded-tr-sm" : "bg-surface text-ink border border-border/60 rounded-tl-sm"
                  } ${isOptimistic ? "opacity-70" : ""}`}>
                    <p className="text-sm leading-relaxed break-words">
                      {msg.type === "image" ? <span className="flex items-center gap-1">📷 <span>صورة</span></span> : msg.content}
                    </p>
                    {isOptimistic ? (
                      <div className="flex items-center gap-[3px] mt-1.5 justify-start">
                        <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <p className={`text-[10px] mt-1 ${isMe ? "text-white/70 text-left" : "text-mist text-right"}`} dir="ltr">
                        {formatTime(msg.created_at)}
                        {isMe && <span className="mr-1">{msg.is_read ? " ✓✓" : " ✓"}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="bg-surface border-t border-border px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          className="flex-1 bg-fog border border-border rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
          dir="rtl"
        />
        <button onClick={handleSend} disabled={!inputText.trim()}
          className="w-10 h-10 bg-olive text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 rotate-180">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
