import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface Props {
  streamId: string;
  currentUserId?: string;
}

export function LiveChat({ streamId, currentUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("stream_messages")
        .select("id, user_id, content, created_at")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (cancelled || !data) return;
      const ids = Array.from(new Set(data.map((m: any) => m.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setMessages(
        data.map((m: any) => ({
          ...m,
          username: (map.get(m.user_id) as any)?.username || "User",
          avatar_url: (map.get(m.user_id) as any)?.avatar_url,
        }))
      );
    })();

    const channel = supabase
      .channel(`stream-chat-${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_messages", filter: `stream_id=eq.${streamId}` },
        async (payload) => {
          const m = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", m.user_id)
            .single();
          setMessages((prev) => [
            ...prev,
            { ...m, username: profile?.username || "User", avatar_url: profile?.avatar_url },
          ]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !currentUserId || sending) return;
    setSending(true);
    const content = input.trim().slice(0, 500);
    setInput("");
    const { error } = await supabase.from("stream_messages").insert({
      stream_id: streamId,
      user_id: currentUserId,
      content,
    });
    if (error) console.error(error);
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2"
            >
              <UserAvatar userId={m.user_id} username={m.username || "U"} avatarUrl={m.avatar_url} size="xs" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-primary/90 truncate">{m.username}</div>
                <div className="text-xs text-white/95 break-words leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {m.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="text-center text-[11px] text-white/50 py-4">Birinchi bo'lib yozing 👋</div>
        )}
      </div>
      {currentUserId ? (
        <div className="p-2 border-t border-white/10 bg-black/40 backdrop-blur">
          <div className="flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Xabar..."
              maxLength={500}
              className="flex-1 bg-white/10 text-white text-xs rounded-full px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 text-center text-[11px] text-white/60 border-t border-white/10">
          Chat yozish uchun tizimga kiring
        </div>
      )}
    </div>
  );
}
