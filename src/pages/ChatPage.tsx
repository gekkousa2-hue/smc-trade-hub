import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ArrowLeft,
  Search,
  MessageSquare,
  X,
  Check,
  CheckCheck,
  MessagesSquare,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user?: Profile;
  last_message?: string;
  last_message_at?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  conversation_id: string | null;
  profiles?: { username: string; avatar_url: string | null } | null;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const tempToRealId = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!data) return;

    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .eq("user_id", otherUserId)
          .single();

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...conv,
          other_user: profile || undefined,
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        } as Conversation;
      })
    );

    setConversations(enriched);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(username, avatar_url)")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", payload.new.sender_id)
            .single();

          const newMsg: Message = {
            ...(payload.new as Message),
            profiles: profile,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => fetchConversations()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .ilike("username", `%${searchQuery}%`)
        .neq("user_id", user.id)
        .limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  const openConversation = async (otherUserId: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: otherUserId,
    });
    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }
    setActiveConversationId(data as string);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setShowSidebar(false);
    fetchConversations();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeConversationId) return;

    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setNewMessage("");

    // Optimistic add
    const optimisticMsg: Message = {
      id: tempId,
      content,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      conversation_id: activeConversationId,
      profiles: null,
    };
    setSendingIds((prev) => new Set(prev).add(tempId));
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({ content, sender_id: user.id, conversation_id: activeConversationId })
        .select("id")
        .single();

      if (error) throw error;

      // Map temp to real id for dedup
      tempToRealId.current.set(data.id, tempId);
      setSendingIds((prev) => { const s = new Set(prev); s.delete(tempId); return s; });
      setConfirmedIds((prev) => new Set(prev).add(tempId));

      // Replace temp id with real id
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
      );
      setConfirmedIds((prev) => { const s = new Set(prev); s.delete(tempId); s.add(data.id); return s; });
      fetchConversations();
    } catch (err) {
      // Rollback on error
      setSendingIds((prev) => { const s = new Set(prev); s.delete(tempId); return s; });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Xabar yuborishda xatolik:", err);
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const getAvatarColor = (id: string) => {
    const colors = [
      "from-primary/90 to-primary/50",
      "from-[hsl(142_60%_45%)] to-[hsl(142_60%_35%)]",
      "from-[hsl(210_80%_55%)] to-[hsl(210_80%_40%)]",
      "from-[hsl(270_60%_55%)] to-[hsl(270_60%_40%)]",
      "from-[hsl(330_60%_55%)] to-[hsl(330_60%_40%)]",
      "from-[hsl(20_80%_55%)] to-[hsl(20_80%_40%)]",
    ];
    return colors[id.charCodeAt(0) % colors.length];
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("uz", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden md:flex"
        } w-full md:w-80 flex-col border-r border-border/30`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
          <MessagesSquare className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground">Xabarlar</h1>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(!!e.target.value);
              }}
              placeholder="Treyderlarni qidirish..."
              className="w-full rounded-xl bg-secondary/80 pl-9 pr-8 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearching(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {isSearching ? (
            <div className="px-2 py-1">
              <p className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Natijalar
              </p>
              {searchResults.length === 0 && searchQuery.trim() && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Hech narsa topilmadi
                </p>
              )}
              {searchResults.map((profile) => (
                <button
                  key={profile.user_id}
                  onClick={() => openConversation(profile.user_id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-secondary/80 active:scale-[0.98]"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(profile.user_id)}`}
                  >
                    {getInitials(profile.username)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{profile.username}</p>
                    <p className="text-xs text-primary/70 font-mono">Xabar yozish →</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass border-glow mb-4">
                    <MessageSquare className="h-9 w-9 text-primary/50" />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground mb-1">
                    Suhbatlar yo'q
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Suhbatni boshlash uchun yuqoridagi qidiruvdan treyderlarni toping
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setShowSidebar(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 mb-0.5 transition-all active:scale-[0.98] ${
                      activeConversationId === conv.id
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-secondary/60"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(conv.other_user?.user_id || "")}`}
                    >
                      {getInitials(conv.other_user?.username || "?")}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {conv.other_user?.username || "Noma'lum"}
                        </p>
                        {conv.last_message_at && (
                          <span className="font-mono text-[10px] text-muted-foreground/60 ml-2 shrink-0">
                            {formatTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          !showSidebar ? "flex" : "hidden md:flex"
        } flex-1 flex-col`}
      >
        {activeConversationId && activeConversation ? (
          <>
            {/* Chat Header */}
            <header className="glass sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <button
                onClick={() => setShowSidebar(true)}
                className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(activeConversation.other_user?.user_id || "")}`}
              >
                {getInitials(activeConversation.other_user?.username || "?")}
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">
                  {activeConversation.other_user?.username || "Noma'lum"}
                </h2>
                <p className="font-mono text-[10px] text-primary/60">SMC Trader</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl mb-2">👋</p>
                    <p className="text-sm text-muted-foreground">
                      Salomlashing va suhbatni boshlang!
                    </p>
                  </div>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const isTemp = msg.id.startsWith("temp-");

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[78%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            isOwn
                              ? "rounded-br-md bg-primary text-primary-foreground shadow-[0_2px_12px_-4px_hsl(45_93%_58%/0.3)]"
                              : "rounded-bl-md glass"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                          <span className="font-mono text-[10px] text-muted-foreground/50">
                            {formatTime(msg.created_at)}
                          </span>
                          {isOwn && (
                            <span className="text-primary/70">
                              {isTemp ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <CheckCheck className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="glass border-t border-border/30 px-4 py-3">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Xabar yozing..."
                  className="flex-1 rounded-xl bg-secondary/80 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(45_93%_58%/0.4)] active:scale-95 disabled:opacity-30 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass border-glow mb-5">
                <MessageSquare className="h-9 w-9 text-primary/50" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-1.5">
                Suhbatni tanlang
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Chap tomondagi ro'yxatdan chat tanlang yoki treyderlarni qidiring
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
